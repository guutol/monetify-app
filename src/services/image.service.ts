import { openai } from "@/lib/openai";
import { buildGenerationKey, uploadToS3, getPresignedUrl } from "@/lib/s3";
import { prisma } from "@/lib/prisma";

const isDev = process.env.NODE_ENV !== "production";
// USE_MOCK_IMAGE=true skips OpenAI + S3 and returns a placeholder image.
// Ignored in production regardless of the env value.
const isMock = isDev && process.env.USE_MOCK_IMAGE === "true";

const MOCK_IMAGE_URL = "https://picsum.photos/seed/monetify/1024/1024";

export async function generateProductImage(prompt: string, userId: string, orderId: string) {
  if (isMock) {
    console.log("[generate] USE_MOCK_IMAGE=true — skipping OpenAI + S3");

    const image = await prisma.generatedImage.create({
      data: { userId, prompt, imageUrl: MOCK_IMAGE_URL },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { imageId: image.id, generationStatus: "COMPLETED" },
    });

    console.log("[generate] mock done, imageId:", image.id);

    return { presignedUrl: MOCK_IMAGE_URL, imageId: image.id };
  }

  // ── Real flow: OpenAI → S3 → DB ───────────────────────────────────────────

  if (isDev) console.log("[generate] calling OpenAI images.generate...");

  let response: Awaited<ReturnType<typeof openai.images.generate>>;
  try {
    response = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "high",
    });
  } catch (err) {
    if (isDev) console.error("[generate] OpenAI error:", err);
    throw err;
  }

  if (isDev) console.log("[generate] OpenAI response keys:", Object.keys(response.data?.[0] ?? {}));

  const base64 = response.data?.[0]?.b64_json;
  if (!base64) {
    const detail = isDev ? JSON.stringify(response.data?.[0]) : "";
    throw new Error(`OpenAI não retornou imagem${detail ? `: ${detail}` : ""}`);
  }

  if (isDev) console.log("[generate] base64 received, length:", base64.length);

  const image = await prisma.generatedImage.create({
    data: { userId, prompt, imageUrl: "" },
  });

  const s3Key = buildGenerationKey(userId, image.id);

  if (isDev) console.log("[generate] uploading to S3, key:", s3Key);

  try {
    await uploadToS3(base64, s3Key);
  } catch (err) {
    if (isDev) console.error("[generate] S3 upload error:", err);
    await prisma.generatedImage.delete({ where: { id: image.id } }).catch(() => null);
    throw err;
  }

  if (isDev) console.log("[generate] S3 upload done, updating DB...");

  await prisma.$transaction([
    prisma.generatedImage.update({
      where: { id: image.id },
      data: { s3Key },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: { imageId: image.id, generationStatus: "COMPLETED" },
    }),
  ]);

  const presignedUrl = await getPresignedUrl(s3Key);

  if (isDev) console.log("[generate] done, imageId:", image.id);

  return { presignedUrl, imageId: image.id };
}
