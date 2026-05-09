import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { getPaymentById } from "@/lib/mercadopago";
import { handlePackagePayment } from "@/lib/order-payment";

const isProd = process.env.NODE_ENV === "production";

const TERMINAL_ORDER_STATUSES = new Set(["PAID", "CANCELLED", "FAILED", "REFUNDED"]);

// Statuses do MP que representam ação terminal e devem ser processados.
// "pending" / "in_process" / "authorized" chegam antes do pagamento ser confirmado
// e NÃO devem bloquear o processamento futuro do "approved".
const MP_ACTIONABLE_STATUSES = new Set(["approved", "cancelled", "rejected"]);

function verifySignature(
  xSig: string,
  xRequestId: string,
  paymentId: string,
  secret: string
): boolean {
  const parts: Record<string, string> = {};
  for (const part of xSig.split(",")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    parts[part.slice(0, idx)] = part.slice(idx + 1);
  }
  const { ts, v1 } = parts;
  if (!ts || !v1) return false;

  const manifest = `id:${paymentId};request-id:${xRequestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(v1, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  console.log("[mp-webhook] route hit");

  const rawBody = await req.text();

  let body: {
    type?: string;
    action?: string;
    id?: unknown;
    data?: { id?: string | number };
  } = {};
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // body.id  = ID da notificação/evento (NÃO é o paymentId)
  // body.data.id = ID real do pagamento no Mercado Pago
  const notificationId = body.id;
  const rawPaymentId = body.data?.id;
  const paymentId = rawPaymentId != null ? String(rawPaymentId) : null;

  console.log("[mp-webhook] action:", body.action);
  console.log("[mp-webhook] type:", body.type);
  console.log("[mp-webhook] notificationId:", notificationId);
  console.log("[mp-webhook] paymentId:", paymentId);

  if (body.type !== "payment") {
    console.log("[mp-webhook] tipo ignorado:", body.type);
    return NextResponse.json({ received: true });
  }

  if (!paymentId) {
    console.error("[mp-webhook] paymentId ausente no payload");
    return NextResponse.json({ error: "Missing payment id" }, { status: 400 });
  }

  // Validação de assinatura
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (secret) {
    const xSig = req.headers.get("x-signature") ?? "";
    const xReqId = req.headers.get("x-request-id") ?? "";
    const valid = verifySignature(xSig, xReqId, paymentId, secret);
    console.log("[mp-webhook] signature validation result:", valid);
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else if (isProd) {
    console.error("[mp-webhook] MERCADOPAGO_WEBHOOK_SECRET não configurado em produção");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  } else {
    console.log("[mp-webhook] signature validation: skipped (sem secret em dev)");
  }

  // Consulta o status real do pagamento na API do MP ANTES da checagem de idempotência.
  //
  // Motivo: o MP envia payment.updated para CADA transição de status do pagamento
  // (ex: pending → in_process → approved). Se usarmos WebhookEvent como única
  // barreira de idempotência, a notificação "pending" cria o evento como SUCCESS e
  // bloqueia o processamento da notificação "approved" como duplicata.
  //
  // A solução correta é: só bloquear como duplicata se a Order já estiver em estado
  // terminal (PAID/CANCELLED/FAILED), que é o estado real que nos interessa.
  let payment: Awaited<ReturnType<typeof getPaymentById>>;
  try {
    console.log("[mp-webhook] getPaymentById called:", paymentId);
    payment = await getPaymentById(paymentId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[mp-webhook] falha ao consultar pagamento no MP:", msg);
    // Retorna 500 para que o MP retente a entrega
    return NextResponse.json({ error: "Failed to fetch payment" }, { status: 500 });
  }

  const mpStatus = payment.status ?? "unknown";
  const externalReference = payment.external_reference ?? null;

  console.log("[mp-webhook] payment.status:", mpStatus);
  console.log("[mp-webhook] payment.external_reference:", externalReference);

  // Notificações de status não-acionáveis (pending, in_process, authorized, etc.)
  // não requerem processamento — retornar 200 sem criar WebhookEvent
  if (!MP_ACTIONABLE_STATUSES.has(mpStatus)) {
    console.log("[mp-webhook] status não acionável, ignorando:", mpStatus);
    return NextResponse.json({ received: true });
  }

  // Busca a Order pelo externalId (MP payment ID salvo no checkout)
  // Não depende de external_reference, que pode não vir na resposta da API
  const order = await prisma.order.findFirst({
    where: { externalId: paymentId },
    select: { id: true, orderType: true, planId: true, userId: true, paymentStatus: true },
  });

  console.log("[mp-webhook] order found:", order ? "yes" : "no");
  if (order) {
    console.log("[mp-webhook] order.id:", order.id);
    console.log("[mp-webhook] order.paymentStatus before:", order.paymentStatus);
  }

  if (!order) {
    const msg = `Order não encontrada para externalId: ${paymentId} | external_reference: ${externalReference}`;
    console.error("[mp-webhook]", msg);
    // Em prod retorna 200 para evitar retentativas infinitas
    if (isProd) return NextResponse.json({ received: true, warning: "order_not_found" });
    return NextResponse.json({ error: msg }, { status: 422 });
  }

  // Idempotência baseada no estado real da Order — não no WebhookEvent
  if (TERMINAL_ORDER_STATUSES.has(order.paymentStatus)) {
    console.log("[mp-webhook] order já em estado terminal, ignorando:", order.paymentStatus);
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Registra para auditoria (upsert: recria se existia como PROCESSING de tentativa anterior)
  const webhookEventId = `mp_${paymentId}`;
  await prisma.webhookEvent.upsert({
    where: { id: webhookEventId },
    create: { id: webhookEventId, event: body.action ?? "payment.updated", status: "PROCESSING" },
    update: { status: "PROCESSING" },
  });

  try {
    let processResult: string;

    if (mpStatus === "approved") {
      if (order.orderType === "PACKAGE") {
        console.log("[mp-webhook] chamando handlePackagePayment para orderId:", order.id);
        const result = await handlePackagePayment(order.id, order.planId, order.userId, payment as object);
        processResult = `handlePackagePayment: creditsAdded=${result.creditsAdded} alreadyCredited=${result.alreadyCredited}`;
      } else {
        console.log("[mp-webhook] marcando GENERATION order como PAID:", order.id);
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: "PAID", rawWebhookData: payment as object },
        });
        processResult = "order.paymentStatus = PAID";
      }
    } else if (mpStatus === "cancelled") {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: "CANCELLED" },
      });
      processResult = "order.paymentStatus = CANCELLED";
    } else {
      // "rejected"
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: "FAILED" },
      });
      processResult = "order.paymentStatus = FAILED";
    }

    console.log("[mp-webhook] process result:", processResult);
    console.log("[mp-webhook] order.paymentStatus after:", mpStatus === "approved" ? "PAID" : mpStatus === "cancelled" ? "CANCELLED" : "FAILED");

    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: { status: "SUCCESS", orderId: order.id },
    });

    return NextResponse.json({ received: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[mp-webhook] erro interno:", msg);
    if (stack) console.error("[mp-webhook] stack:", stack);

    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: { status: "FAILED", error: msg },
    });

    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
