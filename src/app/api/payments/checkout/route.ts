import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createPixPayment } from "@/lib/mercadopago";
import { PRICE_PER_GENERATION_CENTS } from "@/config/pricing";
import { getStylePrompt, getPresetName } from "@/lib/prompts";

const STYLE_IDS = ["marketplace", "colored-bg", "scene", "premium", "social"] as const;

const schema = z.object({
  selectedStyle: z.enum(STYLE_IDS),
  backgroundColorMode: z.enum(["auto", "specific"]).nullish(),
  backgroundColor: z.string().nullish(),
  uploadKey: z.string().nullish(),
});

function isValidUploadKey(key: string, userId: string): boolean {
  return (
    key.startsWith(`uploads/${userId}/`) ||
    key.startsWith(`mock/uploads/${userId}/`)
  );
}

const isDev = process.env.NODE_ENV !== "production";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    if (isDev) console.error("[checkout] zod errors:", JSON.stringify(parsed.error.flatten()));
    return NextResponse.json({ error: "Opções de geração inválidas" }, { status: 400 });
  }

  const { selectedStyle, backgroundColorMode, backgroundColor, uploadKey } = parsed.data;
  const userId = session.user.id;
  const userEmail = session.user.email ?? "cliente@monetify.com.br";

  if (uploadKey && !isValidUploadKey(uploadKey, userId)) {
    return NextResponse.json({ error: "uploadKey inválido" }, { status: 422 });
  }

  if (isDev) {
    console.log(`[checkout] userId=${userId} style=${selectedStyle} preset=${getPresetName(selectedStyle)} colorMode=${backgroundColorMode} color=${backgroundColor}`);
  }

  const prompt = getStylePrompt(selectedStyle, backgroundColorMode ?? null, backgroundColor ?? null);

  if (isDev) console.log("[checkout] prompt length:", prompt.length);

  if (!prompt) {
    return NextResponse.json({ error: "Estilo de geração inválido" }, { status: 400 });
  }

  // Create Order in PENDING state before calling AbacatePay
  const order = await prisma.order.create({
    data: {
      userId,
      amount: PRICE_PER_GENERATION_CENTS,
      paymentMethod: "PIX",
      paymentStatus: "PENDING",
      generationStatus: "PENDING",
      prompt,
      originalImageKey: uploadKey,
    },
  });

  console.log("[checkout] criando PIX", {
    orderId: order.id,
    amountCents: PRICE_PER_GENERATION_CENTS,
    transactionAmount: PRICE_PER_GENERATION_CENTS / 100,
    payerEmail: userEmail,
  });

  try {
    const pixData = await createPixPayment({
      amountCents: PRICE_PER_GENERATION_CENTS,
      orderId: order.id,
      payerEmail: userEmail,
      description: "Monetify - Imagem sem marca d'água",
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

    return NextResponse.json({
      orderId: order.id,
      brCode: pixData.brCode,
      brCodeBase64: pixData.brCodeBase64,
      expiresAt: pixData.expiresAt,
      amount: PRICE_PER_GENERATION_CENTS,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[checkout] PIX falhou orderId=${order.id}: ${msg}`);

    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "FAILED" },
    });

    return NextResponse.json({ error: "Erro ao criar cobrança. Tente novamente." }, { status: 502 });
  }
}
