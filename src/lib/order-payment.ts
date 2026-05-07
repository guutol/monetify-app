import { prisma } from "@/lib/prisma";
import { getPlanById, type PlanId } from "@/config/pricing";

const isDev = process.env.NODE_ENV !== "production";

export interface HandlePackagePaymentResult {
  alreadyCredited: boolean;
  creditsAdded: number;
}

/**
 * Marca uma Order PACKAGE como PAID, incrementa User.credits e registra
 * uma CreditTransaction PURCHASED. Idempotente: chamar duas vezes para a
 * mesma Order não duplica créditos.
 *
 * Usado pelo webhook real e pela rota dev simulate-paid-webhook.
 */
export async function handlePackagePayment(
  orderId: string,
  planId: string | null,
  userId: string,
  rawWebhookData: object,
): Promise<HandlePackagePaymentResult> {
  if (!planId) {
    throw new Error(`PACKAGE order ${orderId} sem planId`);
  }

  const plan = getPlanById(planId as PlanId);
  if (!plan || plan.planId === "single") {
    throw new Error(`planId inválido para PACKAGE order ${orderId}: "${planId}"`);
  }

  const { productsCount } = plan;

  if (isDev) {
    console.log(`[order-payment] PACKAGE planId=${planId} | productsCount=${productsCount} | userId=${userId}`);
  }

  return await prisma.$transaction(async (tx) => {
    // Idempotência: não duplicar créditos se chamado mais de uma vez
    const alreadyCredited = await tx.creditTransaction.findFirst({
      where: { orderId, type: "PURCHASED" },
      select: { id: true },
    });

    if (alreadyCredited) {
      if (isDev) {
        console.log("[order-payment] PACKAGE já creditado — garantindo PAID, orderId:", orderId);
      }
      await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: "PAID", rawWebhookData },
      });
      return { alreadyCredited: true, creditsAdded: 0 };
    }

    await tx.order.update({
      where: { id: orderId },
      data: { paymentStatus: "PAID", rawWebhookData },
    });

    await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: productsCount } },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        type: "PURCHASED",
        amount: productsCount,
        orderId,
      },
    });

    if (isDev) {
      console.log(`[order-payment] PACKAGE creditado: +${productsCount} produtos para userId=${userId}`);
    }

    return { alreadyCredited: false, creditsAdded: productsCount };
  });
}
