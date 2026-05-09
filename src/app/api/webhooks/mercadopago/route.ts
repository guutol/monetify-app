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

  let body: { type?: string; data?: { id?: string } } = {};
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Mercado Pago envia vários tipos de notificação; só processamos "payment"
  if (body.type !== "payment") {
    return NextResponse.json({ received: true });
  }

  const paymentId = body.data?.id;
  if (!paymentId) {
    return NextResponse.json({ error: "Missing payment id" }, { status: 400 });
  }

  // Validação de assinatura
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (secret) {
    const xSig = req.headers.get("x-signature") ?? "";
    const xReqId = req.headers.get("x-request-id") ?? "";
    if (!verifySignature(xSig, xReqId, paymentId, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else if (isProd) {
    console.error("[webhook/mp] MERCADOPAGO_WEBHOOK_SECRET não configurado em produção");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // Idempotência: prefixar com "mp_" para não colidir com eventos da AbacatePay
  const webhookEventId = `mp_${paymentId}`;
  const existing = await prisma.webhookEvent.findUnique({ where: { id: webhookEventId } });
  if (existing?.status === "SUCCESS") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (!existing) {
    await prisma.webhookEvent.create({
      data: { id: webhookEventId, event: "payment.updated", status: "PROCESSING" },
    });
  }

  try {
    // Busca o pagamento na API do MP — nunca confiar apenas na notificação
    const payment = await getPaymentById(paymentId);

    const status = payment.status;
    const externalReference = payment.external_reference; // nosso orderId

    if (!externalReference) {
      await prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: { status: "FAILED", error: "Payment has no external_reference" },
      });
      return NextResponse.json({ received: true, warning: "no_external_reference" });
    }

    const order = await prisma.order.findUnique({
      where: { id: externalReference },
      select: { id: true, orderType: true, planId: true, userId: true, paymentStatus: true },
    });

    if (!order) {
      const msg = `Order not found: ${externalReference}`;
      await prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: { status: "FAILED", error: msg },
      });
      if (isProd) return NextResponse.json({ received: true, warning: "order_not_found" });
      return NextResponse.json({ error: msg }, { status: 422 });
    }

    if (status === "approved") {
      if (order.orderType === "PACKAGE") {
        await handlePackagePayment(order.id, order.planId, order.userId, payment as object);
      } else {
        if (order.paymentStatus !== "PAID") {
          await prisma.order.update({
            where: { id: order.id },
            data: { paymentStatus: "PAID", rawWebhookData: payment as object },
          });
        }
      }
    } else if (status === "cancelled" && order.paymentStatus === "PENDING") {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: "CANCELLED" },
      });
    } else if (status === "rejected" && order.paymentStatus === "PENDING") {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: "FAILED" },
      });
    }
    // pending / in_process / outros: ignorar sem erro

    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: { status: "SUCCESS", orderId: order.id },
    });

    return NextResponse.json({ received: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (!isProd) console.error("[webhook/mp] error:", msg);

    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: { status: "FAILED", error: msg },
    });

    // 500 faz o MP retentar a entrega
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
