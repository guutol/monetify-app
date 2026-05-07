import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookUrlSecret, verifyAbacatePaySignature } from "@/lib/abacatepay";
import { handlePackagePayment } from "@/lib/order-payment";

// AbacatePay webhook payload types (v2)
interface AbacatePayWebhookPayload {
  id: string;
  event: string;
  apiVersion: number;
  devMode: boolean;
  data: {
    checkout?: { id: string; [key: string]: unknown };
    transparent?: { id: string; [key: string]: unknown };
    refund?: { id?: string; [key: string]: unknown };
    reason?: string;
    id?: string;
    [key: string]: unknown;
  };
}

// Eventos que requerem uma Order para serem processados
const ORDER_REQUIRED_EVENTS = new Set([
  "checkout.completed",
  "checkout.refunded",
  "checkout.disputed",
  "transparent.completed",
  "transparent.refunded",
  "transparent.disputed",
]);

function resolveExternalId(event: string, data: AbacatePayWebhookPayload["data"]): string | null {
  if (event.startsWith("checkout.")) return data.checkout?.id ?? null;
  if (event.startsWith("transparent.")) return data.transparent?.id ?? null;
  // Fallback para eventos desconhecidos
  return data.id ?? null;
}

export async function POST(req: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";

  // ── Body raw: deve ser lido antes de qualquer parse para HMAC funcionar ──
  const rawBody = await req.text();

  // ── Validação 1: secret na URL ────────────────────────────────────────────
  // Produção: obrigatório. Desenvolvimento: ignorado se não configurado.
  if (process.env.ABACATEPAY_WEBHOOK_URL_SECRET) {
    if (!verifyWebhookUrlSecret(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (isProd) {
    console.error("[webhook] ABACATEPAY_WEBHOOK_URL_SECRET não configurado em produção");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // ── Validação 2: assinatura HMAC-SHA256 (X-Webhook-Signature) ────────────
  // Produção: obrigatório — AbacatePay recomenda os dois mecanismos juntos.
  // Desenvolvimento: ignorado se ABACATEPAY_WEBHOOK_SIGNATURE_KEY não estiver
  // configurado, para facilitar testes locais sem precisar assinar payloads.
  //
  // TODO: Confirmar no dashboard AbacatePay qual valor usar em
  //       ABACATEPAY_WEBHOOK_SIGNATURE_KEY (chave por-conta ou a chave global
  //       exibida na documentação deles como ABACATEPAY_PUBLIC_KEY).
  //       Referência: https://docs.abacatepay.com/pages/webhooks
  if (process.env.ABACATEPAY_WEBHOOK_SIGNATURE_KEY) {
    const signature = req.headers.get("x-webhook-signature") ?? "";
    if (!verifyAbacatePaySignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else if (isProd) {
    console.error("[webhook] ABACATEPAY_WEBHOOK_SIGNATURE_KEY não configurado em produção");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // ── Parse do payload ──────────────────────────────────────────────────────
  let payload: AbacatePayWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as AbacatePayWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id: webhookId, event, data } = payload;

  if (!webhookId || !event) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // ── Idempotência: ignorar eventos já processados ──────────────────────────
  const existing = await prisma.webhookEvent.findUnique({ where: { id: webhookId } });
  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Registra antes de processar para garantir idempotência mesmo em crash
  await prisma.webhookEvent.create({
    data: { id: webhookId, event, status: "PROCESSING" },
  });

  // ── Processar evento ──────────────────────────────────────────────────────
  try {
    // Extrai externalId de acordo com o prefixo do evento
    const externalId = resolveExternalId(event, data);
    let orderId: string | null = null;
    let orderType: string | null = null;
    let orderPlanId: string | null = null;
    let orderUserId: string | null = null;

    if (externalId) {
      const order = await prisma.order.findUnique({
        where: { externalId },
        select: { id: true, orderType: true, planId: true, userId: true },
      });
      orderId = order?.id ?? null;
      orderType = order?.orderType ?? null;
      orderPlanId = order?.planId ?? null;
      orderUserId = order?.userId ?? null;
    }

    // Eventos que necessitam de uma Order: falhar com erro claro se não encontrada
    if (ORDER_REQUIRED_EVENTS.has(event) && !orderId) {
      const errorMsg = `Order not found for externalId: ${externalId ?? "(none)"}`;

      await prisma.webhookEvent.update({
        where: { id: webhookId },
        data: { status: "FAILED", error: errorMsg },
      });

      // Dev: retorna erro visível para debugging
      // Prod: retorna 200 para evitar retentativas infinitas da AbacatePay
      //       (a Order não vai aparecer por retentativa)
      if (isProd) {
        return NextResponse.json({ received: true, warning: "order_not_found" });
      }
      return NextResponse.json({ error: errorMsg }, { status: 422 });
    }

    switch (event) {
      case "checkout.completed":
      case "transparent.completed": {
        if (orderType === "PACKAGE") {
          await handlePackagePayment(orderId!, orderPlanId, orderUserId!, payload as object);
          // result.creditsAdded / result.alreadyCredited available if needed for logging
        } else {
          await prisma.order.update({
            where: { id: orderId! },
            data: {
              paymentStatus: "PAID",
              rawWebhookData: payload as object,
            },
          });
        }
        break;
      }

      case "checkout.refunded":
      case "transparent.refunded": {
        // data.refund.id é o ID do reembolso no AbacatePay, quando presente
        const externalRefundId = data.refund?.id ?? null;

        await prisma.order.update({
          where: { id: orderId! },
          data: {
            paymentStatus: "REFUNDED",
            refundStatus: "REFUNDED",
            refundedAt: new Date(),
            ...(externalRefundId ? { externalRefundId } : {}),
            rawWebhookData: payload as object,
          },
        });
        break;
      }

      case "checkout.disputed":
      case "transparent.disputed": {
        await prisma.order.update({
          where: { id: orderId! },
          data: {
            disputeStatus: "OPEN",
            isFlagged: true,
            rawWebhookData: payload as object,
          },
        });
        break;
      }

      default: {
        // Evento desconhecido: registrar e retornar 200 para não causar retentativas
        break;
      }
    }

    await prisma.webhookEvent.update({
      where: { id: webhookId },
      data: { status: "SUCCESS", orderId: orderId ?? undefined },
    });

    return NextResponse.json({ received: true });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    await prisma.webhookEvent.update({
      where: { id: webhookId },
      data: { status: "FAILED", error: errorMessage },
    });

    // 500 faz AbacatePay retentar a entrega
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
