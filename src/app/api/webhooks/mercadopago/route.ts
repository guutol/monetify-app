import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { getPaymentById } from "@/lib/mercadopago";
import { handlePackagePayment } from "@/lib/order-payment";

const isProd = process.env.NODE_ENV === "production";

// Valida assinatura x-signature do Mercado Pago.
// Formato: ts=1111111111,v1=abc123...
// Manifest: id:{paymentId};request-id:{xRequestId};ts:{ts};
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

  // body.id  = ID da notificação (não é o paymentId)
  // body.data.id = ID real do pagamento no Mercado Pago
  const notificationId = body.id;
  const rawPaymentId = body.data?.id;
  const paymentId = rawPaymentId != null ? String(rawPaymentId) : null;

  console.log("[webhook/mp] recebido:", {
    notificationId,
    paymentId,
    action: body.action,
    type: body.type,
  });

  // Só processa eventos do tipo "payment"
  if (body.type !== "payment") {
    console.log("[webhook/mp] tipo ignorado:", body.type);
    return NextResponse.json({ received: true });
  }

  if (!paymentId) {
    console.error("[webhook/mp] paymentId ausente no payload:", JSON.stringify(body));
    return NextResponse.json({ error: "Missing payment id" }, { status: 400 });
  }

  // Validação de assinatura
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (secret) {
    const xSig = req.headers.get("x-signature") ?? "";
    const xReqId = req.headers.get("x-request-id") ?? "";
    if (!verifySignature(xSig, xReqId, paymentId, secret)) {
      console.error("[webhook/mp] assinatura inválida para paymentId:", paymentId);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else if (isProd) {
    console.error("[webhook/mp] MERCADOPAGO_WEBHOOK_SECRET não configurado em produção");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // Idempotência: prefixar com "mp_" para não colidir com eventos AbacatePay
  const webhookEventId = `mp_${paymentId}`;
  const existing = await prisma.webhookEvent.findUnique({ where: { id: webhookEventId } });
  if (existing?.status === "SUCCESS") {
    console.log("[webhook/mp] evento duplicado, ignorando:", webhookEventId);
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (!existing) {
    await prisma.webhookEvent.create({
      data: { id: webhookEventId, event: body.action ?? "payment.updated", status: "PROCESSING" },
    });
  }

  try {
    // Consulta o pagamento real na API do MP — nunca confiar só na notificação
    const payment = await getPaymentById(paymentId);

    const mpStatus = payment.status;
    const externalReference = payment.external_reference ?? null;

    console.log("[webhook/mp] pagamento consultado:", {
      paymentId,
      mpStatus,
      externalReference,
    });

    // Busca a Order pelo externalId (MP payment ID que salvamos no checkout)
    // É mais robusto do que confiar em external_reference, que pode não vir na resposta
    const order = await prisma.order.findFirst({
      where: { externalId: paymentId },
      select: { id: true, orderType: true, planId: true, userId: true, paymentStatus: true },
    });

    console.log("[webhook/mp] order encontrada:", order
      ? { orderId: order.id, orderType: order.orderType, paymentStatus: order.paymentStatus }
      : null
    );

    if (!order) {
      const msg = `Order não encontrada para externalId: ${paymentId}`;
      console.error("[webhook/mp]", msg, "| external_reference:", externalReference);
      await prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: { status: "FAILED", error: msg },
      });
      // Em prod retorna 200 para o MP não retentar indefinidamente
      if (isProd) return NextResponse.json({ received: true, warning: "order_not_found" });
      return NextResponse.json({ error: msg }, { status: 422 });
    }

    if (mpStatus === "approved") {
      if (order.orderType === "PACKAGE") {
        console.log("[webhook/mp] chamando handlePackagePayment para orderId:", order.id);
        await handlePackagePayment(order.id, order.planId, order.userId, payment as object);
      } else {
        if (order.paymentStatus !== "PAID") {
          console.log("[webhook/mp] marcando GENERATION order como PAID:", order.id, "| antes:", order.paymentStatus);
          await prisma.order.update({
            where: { id: order.id },
            data: { paymentStatus: "PAID", rawWebhookData: payment as object },
          });
          console.log("[webhook/mp] order marcada como PAID:", order.id);
        } else {
          console.log("[webhook/mp] order já estava PAID, ignorando:", order.id);
        }
      }
    } else if (mpStatus === "cancelled" && order.paymentStatus === "PENDING") {
      console.log("[webhook/mp] cancelando order:", order.id);
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: "CANCELLED" },
      });
    } else if (mpStatus === "rejected" && order.paymentStatus === "PENDING") {
      console.log("[webhook/mp] marcando order como FAILED:", order.id);
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: "FAILED" },
      });
    } else {
      console.log("[webhook/mp] status ignorado:", mpStatus, "| orderStatus:", order.paymentStatus);
    }

    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: { status: "SUCCESS", orderId: order.id },
    });

    return NextResponse.json({ received: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[webhook/mp] erro interno:", msg);

    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: { status: "FAILED", error: msg },
    });

    // 500 faz o MP retentar a entrega
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
