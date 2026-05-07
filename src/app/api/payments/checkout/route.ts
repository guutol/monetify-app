import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createPixCharge } from "@/lib/abacatepay-api";
import { PRICE_PER_GENERATION_CENTS } from "@/config/pricing";
import { getStylePrompt } from "@/lib/prompts";

const STYLE_IDS = ["marketplace", "colored-bg", "scene", "premium", "social"] as const;

const schema = z.object({
  selectedStyle: z.enum(STYLE_IDS),
  backgroundColorMode: z.enum(["auto", "specific"]).nullish(),
  backgroundColor: z.string().nullish(),
  uploadKey: z.string().nullish(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  console.log("[checkout] body recebido:", JSON.stringify(body));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    console.error("[checkout] zod errors:", JSON.stringify(parsed.error.flatten()));
    return NextResponse.json({ error: "Opções de geração inválidas" }, { status: 400 });
  }

  const { selectedStyle, backgroundColorMode, backgroundColor, uploadKey } = parsed.data;
  const userId = session.user.id;

  console.log("[checkout] selectedStyle:", selectedStyle, "| colorMode:", backgroundColorMode, "| color:", backgroundColor);

  const prompt = getStylePrompt(selectedStyle, backgroundColorMode ?? null, backgroundColor ?? null);

  console.log("[checkout] prompt length:", prompt.length);

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

  try {
    const pixData = await createPixCharge({
      amount: PRICE_PER_GENERATION_CENTS,
      externalId: order.id,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        externalId: pixData.id,
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
      devMode: pixData.devMode,
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[checkout] AbacatePay error:", err);
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "FAILED" },
    });

    return NextResponse.json({ error: "Erro ao criar cobrança. Tente novamente." }, { status: 502 });
  }
}
