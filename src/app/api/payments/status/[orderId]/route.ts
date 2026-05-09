import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPaymentById } from "@/lib/mercadopago";
import { handlePackagePayment } from "@/lib/order-payment";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      paymentStatus: true,
      generationStatus: true,
      pixExpiresAt: true,
      imageId: true,
      externalId: true,
      orderType: true,
      planId: true,
    },
  });

  if (!order || order.userId !== session.user.id) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  // Fallback de reconciliação: se ainda PENDING e tem externalId (MP payment ID),
  // consulta o MP diretamente para não depender exclusivamente do webhook.
  // Isso garante que o frontend avance mesmo se o webhook falhou ou chegou atrasado.
  if (order.paymentStatus === "PENDING" && order.externalId) {
    try {
      const payment = await getPaymentById(order.externalId);

      if (payment.status === "approved") {
        console.log(`[status] reconciliando order ${order.id} via polling — MP status: approved`);

        if (order.orderType === "PACKAGE") {
          await handlePackagePayment(order.id, order.planId, order.userId, payment as object);
        } else {
          await prisma.order.update({
            where: { id: order.id },
            data: { paymentStatus: "PAID", rawWebhookData: payment as object },
          });
        }

        // Re-lê o estado atual após atualização
        const updated = await prisma.order.findUnique({
          where: { id: order.id },
          select: { paymentStatus: true, generationStatus: true, imageId: true },
        });

        return NextResponse.json({
          paymentStatus: updated?.paymentStatus ?? "PAID",
          generationStatus: updated?.generationStatus ?? order.generationStatus,
          pixExpiresAt: order.pixExpiresAt?.toISOString() ?? null,
          imageId: updated?.imageId ?? order.imageId,
        });
      }
    } catch (err) {
      // Não quebra o polling — loga e retorna estado do banco
      const msg = err instanceof Error ? err.message : "unknown";
      console.error(`[status] reconciliação MP falhou para order ${order.id}:`, msg);
    }
  }

  return NextResponse.json({
    paymentStatus: order.paymentStatus,
    generationStatus: order.generationStatus,
    pixExpiresAt: order.pixExpiresAt?.toISOString() ?? null,
    imageId: order.imageId,
  });
}
