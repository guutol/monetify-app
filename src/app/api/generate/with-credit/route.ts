import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;
import { getStylePrompt, getPresetName } from "@/lib/prompts";
import { generateProductImage } from "@/services/image.service";
import { getGenerationQualities } from "@/config/image-generation";

const isDev = process.env.NODE_ENV !== "production";

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
    key.startsWith(`mock/uploads/${userId}/`) ||
    key.startsWith("temp-uploads/") ||
    key.startsWith("mock/temp-uploads/")
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (isDev) console.log("[with-credit] body:", JSON.stringify(body));

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    if (isDev) console.error("[with-credit] zod errors:", JSON.stringify(parsed.error.flatten()));
    return NextResponse.json({ error: "Opções de geração inválidas" }, { status: 400 });
  }

  const { selectedStyle, backgroundColorMode, backgroundColor, uploadKey } = parsed.data;
  const userId = session.user.id;

  if (uploadKey && !isValidUploadKey(uploadKey, userId)) {
    return NextResponse.json({ error: "uploadKey inválido" }, { status: 422 });
  }

  const prompt = getStylePrompt(selectedStyle, backgroundColorMode ?? null, backgroundColor ?? null);
  if (!prompt) {
    return NextResponse.json({ error: "Estilo de geração inválido" }, { status: 400 });
  }

  if (isDev) console.log(`[with-credit] userId=${userId} style=${selectedStyle} preset=${getPresetName(selectedStyle)} prompt.length=${prompt.length}`);

  // ── Debit credit + create Order + CreditTransaction atomically ────────────
  let order: { id: string };

  try {
    order = await prisma.$transaction(async (tx) => {
      // Atomic debit: only succeeds if credits > 0
      const debit = await tx.user.updateMany({
        where: { id: userId, credits: { gt: 0 } },
        data: { credits: { decrement: 1 } },
      });

      if (debit.count === 0) {
        throw new Error("NO_CREDITS");
      }

      const newOrder = await tx.order.create({
        data: {
          userId,
          amount: 0,
          paymentMethod: "PIX",
          paymentStatus: "PAID",
          generationStatus: "PROCESSING",
          orderType: "GENERATION",
          prompt,
          originalImageKey: uploadKey ?? null,
        },
      });

      await tx.creditTransaction.create({
        data: {
          userId,
          type: "CONSUMED",
          amount: -1,
          orderId: newOrder.id,
        },
      });

      if (isDev) console.log(`[with-credit] credit debited, orderId=${newOrder.id}`);

      return newOrder;
    });
  } catch (err) {
    if (err instanceof Error && err.message === "NO_CREDITS") {
      return NextResponse.json({ error: "Sem produtos disponíveis" }, { status: 402 });
    }
    if (isDev) console.error("[with-credit] transaction error:", err);
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 });
  }

  // ── Generate image ────────────────────────────────────────────────────────
  try {
    const { previews } = await generateProductImage(
      prompt,
      userId,
      order.id,
      uploadKey ?? undefined,
      getGenerationQualities("credit"),
      "credit",
    );

    return NextResponse.json({
      previews: previews.map((p) => ({ imageUrl: p.presignedUrl, imageId: p.imageId })),
      orderId: order.id,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[with-credit] generation failed for orderId=${order.id}: ${errMsg}`);

    // Refund: mark order failed + restore credit + record compensation transaction
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { generationStatus: "FAILED" },
      });
      await tx.user.update({
        where: { id: userId },
        data: { credits: { increment: 1 } },
      });
      await tx.creditTransaction.create({
        data: {
          userId,
          type: "PURCHASED",
          amount: 1,
          orderId: order.id,
        },
      });
    }).then(() => {
      console.log(`[with-credit] credit refunded for orderId=${order.id}`);
    }).catch((refundErr) => {
      // Refund failed — log so ops can identify and fix manually
      const refundMsg = refundErr instanceof Error ? refundErr.message : String(refundErr);
      console.error(`[with-credit] CRITICAL: refund failed for orderId=${order.id}: ${refundMsg}`);
    });

    return NextResponse.json({ error: "Erro ao gerar imagem. Tente novamente." }, { status: 500 });
  }
}
