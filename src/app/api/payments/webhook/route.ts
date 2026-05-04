import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookUrlSecret, verifyAbacatePaySignature } from "@/lib/abacatepay";

// AbacatePay webhook payload types (v2)
interface AbacatePayWebhookPayload {
  id: string;
  event: string;
  apiVersion: number;
  devMode: boolean;
  data: {
    checkout?: { id: string; [key: string]: unknown };
    transparent?: { id: string; [key: string]: unknown };
    reason?: string;
    [key: string]: unknown;
  };
}

export async function POST(req: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";

  // ── Ler body raw (obrigatório antes de qualquer parse para HMAC funcionar) ──
  const rawBody = await req.text();

  // ── Validação 1: secret na URL ────────────────────────────────────────────
  const urlSecretConfigured = !!process.env.ABACATEPAY_WEBHOOK_URL_SECRET;

  if (urlSecretConfigured) {
    if (!verifyWebhookUrlSecret(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (isProd) {
    // Em produção sem secret configurado: recusa para não ficar aberto
    console.error("[webhook] ABACATEPAY_WEBHOOK_URL_SECRET não configurado em produção");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }
  // Em desenvolvimento sem secret: permite para facilitar testes locais

  // ── Validação 2: assinatura HMAC-SHA256 ───────────────────────────────────
  // TODO: Confirmar no dashboard AbacatePay qual valor usar em
  //       ABACATEPAY_WEBHOOK_SIGNATURE_KEY (chave por-conta ou chave global da doc).
  //       Quando confirmado, tornar obrigatória em produção.
  const signatureKeyConfigured = !!process.env.ABACATEPAY_WEBHOOK_SIGNATURE_KEY;

  if (signatureKeyConfigured) {
    const signature = req.headers.get("x-webhook-signature") ?? "";
    if (!verifyAbacatePaySignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
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

  // Registra o evento antes de processar (garante idempotência mesmo em crash)
  await prisma.webhookEvent.create({
    data: { id: webhookId, event, status: "PROCESSING" },
  });

  // ── Processar evento ──────────────────────────────────────────────────────
  try {
    const externalId = data.checkout?.id ?? data.transparent?.id ?? null;
    let orderId: string | null = null;

    if (externalId) {
      const order = await prisma.order.findUnique({
        where: { externalId },
        select: { id: true },
      });
      orderId = order?.id ?? null;
    }

    switch (event) {
      case "checkout.completed":
      case "transparent.completed": {
        if (orderId) {
          await prisma.order.update({
            where: { id: orderId },
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
        if (orderId) {
          // TODO: Verificar se o payload de reembolso inclui um ID de reembolso
          //       (ex: data.refundId). Não documentado claramente pela AbacatePay.
          await prisma.order.update({
            where: { id: orderId },
            data: {
              paymentStatus: "REFUNDED",
              refundStatus: "REFUNDED",
              refundedAt: new Date(),
              rawWebhookData: payload as object,
            },
          });
        }
        break;
      }

      case "checkout.disputed":
      case "transparent.disputed": {
        if (orderId) {
          await prisma.order.update({
            where: { id: orderId },
            data: {
              disputeStatus: "OPEN",
              isFlagged: true,
              rawWebhookData: payload as object,
            },
          });
        }
        break;
      }

      default: {
        // Evento desconhecido: registrar e retornar 200 (não quebrar)
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

    // Retornar 500 para AbacatePay retentar
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
