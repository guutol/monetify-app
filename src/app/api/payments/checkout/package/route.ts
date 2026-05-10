import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createPixPayment } from "@/lib/mercadopago";
import { getPlanById } from "@/config/pricing";

const isDev = process.env.NODE_ENV !== "production";

// "single" é fluxo avulso — não aceito aqui
const schema = z.object({
  planId: z.enum(["pack_5", "pack_10", "pack_20"]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (isDev) console.log("[checkout/package] body recebido:", JSON.stringify(body));

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    if (isDev) console.error("[checkout/package] zod errors:", JSON.stringify(parsed.error.flatten()));
    return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
  }

  const { planId } = parsed.data;

  // Amount vem sempre do backend — nunca do frontend
  const plan = getPlanById(planId);
  if (!plan) {
    return NextResponse.json({ error: "Plano não encontrado" }, { status: 400 });
  }

  const userId = session.user.id;
  const userEmail = session.user.email ?? "cliente@monetify.com.br";

  if (isDev) {
    console.log(`[checkout/package] planId=${planId} | amount=${plan.amountCents} | products=${plan.productsCount}`);
  }

  // Criar Order em estado PENDING antes de chamar AbacatePay
  const order = await prisma.order.create({
    data: {
      userId,
      amount: plan.amountCents,
      paymentMethod: "PIX",
      paymentStatus: "PENDING",
      generationStatus: "PENDING",
      orderType: "PACKAGE",
      planId: plan.planId,
    },
  });

  if (isDev) console.log("[checkout/package] Order criada:", order.id);

  try {
    const pixData = await createPixPayment({
      amountCents: plan.amountCents,
      orderId: order.id,
      payerEmail: userEmail,
      description: `Monetify - ${plan.label}`,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        externalId: pixData.paymentId,
        pixBrCode: pixData.brCode,
        pixBrCodeBase64: pixData.brCodeBase64,
        pixExpiresAt: new Date(pixData.expiresAt),
      },
    });

    if (isDev) console.log("[checkout/package] MP OK, paymentId:", pixData.paymentId);

    return NextResponse.json({
      orderId: order.id,
      brCode: pixData.brCode,
      brCodeBase64: pixData.brCodeBase64,
      expiresAt: pixData.expiresAt,
      amount: plan.amountCents,
      planId: plan.planId,
      planLabel: plan.label,
      productsCount: plan.productsCount,
    });
  } catch (err) {
    if (isDev) console.error("[checkout/package] Mercado Pago error:", err);

    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "FAILED" },
    });

    return NextResponse.json({ error: "Erro ao criar cobrança. Tente novamente." }, { status: 502 });
  }
}
