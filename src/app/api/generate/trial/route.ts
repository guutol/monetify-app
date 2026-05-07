import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStylePrompt, getPresetName } from "@/lib/prompts";
import { generateProductImage } from "@/services/image.service";
import { applyWatermark } from "@/lib/watermark";
import { buildWatermarkKey, uploadRawToS3, getPresignedUrl, downloadFromS3 } from "@/lib/s3";
import { PRICE_PER_GENERATION_CENTS } from "@/config/pricing";

const isDev = process.env.NODE_ENV !== "production";
const isMock = process.env.USE_MOCK_IMAGE === "true" && isDev;

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

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
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

  if (isDev) {
    console.log(`[trial] userId=${userId} style=${selectedStyle} preset=${getPresetName(selectedStyle)}`);
  }

  // ── Lock free trial atomically ─────────────────────────────────────────────
  const locked = await prisma.user.updateMany({
    where: { id: userId, freeTrialUsed: false },
    data: { freeTrialUsed: true },
  });

  if (locked.count === 0) {
    return NextResponse.json({ error: "Teste grátis já utilizado" }, { status: 409 });
  }

  // ── Create Order ───────────────────────────────────────────────────────────
  let order: { id: string };
  try {
    order = await prisma.order.create({
      data: {
        userId,
        amount: PRICE_PER_GENERATION_CENTS,
        paymentMethod: "PIX",
        paymentStatus: "PENDING",
        generationStatus: "PROCESSING",
        orderType: "GENERATION",
        isTrial: true,
        prompt,
        originalImageKey: uploadKey ?? null,
      },
    });
  } catch (err) {
    // Roll back trial lock if order creation fails
    await prisma.user.update({ where: { id: userId }, data: { freeTrialUsed: false } }).catch(() => null);
    if (isDev) console.error("[trial] order create failed:", err);
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 });
  }

  // ── Generate images ────────────────────────────────────────────────────────
  let previews: { imageId: string; watermarkUrl: string }[];

  try {
    const result = await generateProductImage(prompt, userId, order.id, uploadKey ?? undefined);

    // Apply watermarks to each preview
    previews = await Promise.all(
      result.previews.map(async ({ imageId, presignedUrl }) => {
        let watermarkUrl = presignedUrl;

        if (!isMock) {
          // Download original, apply watermark, upload watermarked version
          try {
            const { s3Key } = await prisma.generatedImage.findUniqueOrThrow({
              where: { id: imageId },
              select: { s3Key: true },
            });

            if (s3Key) {
              const original = await downloadFromS3(s3Key);
              const watermarked = await applyWatermark(original);
              const wKey = buildWatermarkKey(userId, imageId);
              await uploadRawToS3(watermarked, wKey, "image/png");
              await prisma.generatedImage.update({
                where: { id: imageId },
                data: { watermarkKey: wKey },
              });
              watermarkUrl = await getPresignedUrl(wKey);
            }
          } catch (wmErr) {
            if (isDev) console.error("[trial] watermark failed for", imageId, wmErr);
            // Non-fatal: fall back to original presigned URL
          }
        }

        return { imageId, watermarkUrl };
      })
    );
  } catch (err) {
    if (isDev) console.error("[trial] generation failed, rolling back:", err);

    // Roll back: mark order failed + release trial lock
    await prisma.$transaction([
      prisma.order.update({ where: { id: order.id }, data: { generationStatus: "FAILED" } }),
      prisma.user.update({ where: { id: userId }, data: { freeTrialUsed: false } }),
    ]).catch(() => null);

    return NextResponse.json({ error: "Erro ao gerar imagem. Tente novamente." }, { status: 500 });
  }

  return NextResponse.json({ orderId: order.id, previews });
}
