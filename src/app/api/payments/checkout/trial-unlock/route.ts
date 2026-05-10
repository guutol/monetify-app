import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createPixPayment } from "@/lib/mercadopago";
import { PRICE_PER_GENERATION_CENTS } from "@/config/pricing";

const schema = z.object({ orderId: z.string() });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "orderId inválido" }, { status: 400 });
  }

  const { orderId } = parsed.data;
  const userId = session.user.id;
  const userEmail = session.user.email ?? "cliente@monetify.com.br";

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, isTrial: true, paymentStatus: true, generationStatus: true, externalId: true },
  });

  if (!order || order.userId !== userId) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  if (!order.isTrial) {
    return NextResponse.json({ error: "Pedido não é um teste grátis" }, { status: 400 });
  }

  if (order.paymentStatus === "PAID") {
    return NextResponse.json({ error: "Pedido já pago" }, { status: 409 });
  }

  if (order.generationStatus !== "COMPLETED") {
    return NextResponse.json({ error: "Prévia ainda não está pronta" }, { status: 409 });
  }

  // If PIX was already created (user clicked Liberar before), return existing data
  if (order.externalId) {
    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      select: { pixBrCode: true, pixBrCodeBase64: true, pixExpiresAt: true },
    });
    return NextResponse.json({
      brCode: existing?.pixBrCode ?? "",
      brCodeBase64: existing?.pixBrCodeBase64 ?? "",
      expiresAt: existing?.pixExpiresAt?.toISOString() ?? null,
      amount: PRICE_PER_GENERATION_CENTS,
    });
  }

  // Create PIX charge
  console.log("[trial-unlock] criando PIX", {
    orderId,
    amountCents: PRICE_PER_GENERATION_CENTS,
    transactionAmount: PRICE_PER_GENERATION_CENTS / 100,
    payerEmail: userEmail,
  });

  try {
    const pixData = await createPixPayment({
      amountCents: PRICE_PER_GENERATION_CENTS,
      orderId,
      payerEmail: userEmail,
      description: "Monetify - Imagem sem marca d'água",
    });

    await prisma.order.update({
      where: { id: orderId },
      data: {
        externalId: pixData.paymentId,
        pixBrCode: pixData.brCode,
        pixBrCodeBase64: pixData.brCodeBase64,
        pixExpiresAt: new Date(pixData.expiresAt),
      },
    });

    return NextResponse.json({
      brCode: pixData.brCode,
      brCodeBase64: pixData.brCodeBase64,
      expiresAt: pixData.expiresAt,
      amount: PRICE_PER_GENERATION_CENTS,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[trial-unlock] PIX falhou orderId=${orderId}: ${msg}`);
    return NextResponse.json({ error: "Erro ao criar cobrança. Tente novamente." }, { status: 502 });
  }
}
