import { openai } from "@/lib/openai";
import { buildGenerationKey, uploadToS3, getPresignedUrl } from "@/lib/s3";
import { prisma } from "@/lib/prisma";

const MOCK_IMAGE_URLS = [
  "https://picsum.photos/seed/monetify-a/1024/1024",
  "https://picsum.photos/seed/monetify-b/1024/1024",
];

function resolveMockFlag(): boolean {
  const isDev = process.env.NODE_ENV !== "production";
  const raw = process.env.USE_MOCK_IMAGE;
  const parsed = raw === "true";

  if (isDev) {
    console.log(`[generate] USE_MOCK_IMAGE raw="${raw}" parsed=${parsed}`);
  }

  if (!isDev && parsed) {
    console.error(
      "[generate] USE_MOCK_IMAGE=true foi detectado em produção — mock IGNORADO. " +
      "Remova essa variável do ambiente de produção."
    );
  }

  return isDev && parsed;
}

export type ImagePreview = { presignedUrl: string; imageId: string };

export async function generateProductImage(
  prompt: string,
  userId: string,
  orderId: string
): Promise<{ previews: ImagePreview[] }> {
  const isMock = resolveMockFlag();

  if (isMock) {
    console.log("[generate] mock mode — skipping OpenAI + S3");

    const images = await Promise.all(
      MOCK_IMAGE_URLS.map((url) =>
        prisma.generatedImage.create({
          data: { userId, orderId, prompt, imageUrl: url },
        })
      )
    );

    await prisma.order.update({
      where: { id: orderId },
      data: { generationStatus: "COMPLETED" },
    });

    console.log("[generate] mock done, imageIds:", images.map((i) => i.id));

    return {
      previews: images.map((img, i) => ({
        presignedUrl: MOCK_IMAGE_URLS[i],
        imageId: img.id,
      })),
    };
  }

  // ── Real flow: OpenAI → S3 → DB ───────────────────────────────────────────

  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) console.log("[generate] calling OpenAI images.generate (n=2)...");

  let response: Awaited<ReturnType<typeof openai.images.generate>>;
  try {
    response = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      n: 2,
      size: "1024x1024",
      quality: "high",
    });
  } catch (err) {
    if (isDev) console.error("[generate] OpenAI error:", err);
    throw err;
  }

  const results = response.data ?? [];
  if (results.length === 0) {
    throw new Error("OpenAI não retornou imagens");
  }

  if (isDev) console.log("[generate] OpenAI returned", results.length, "image(s)");

  // Upload each image to S3 and create DB records sequentially to keep error
  // handling simple — if one fails we clean up and rethrow.
  const previews: ImagePreview[] = [];
  const createdIds: string[] = [];

  try {
    for (let i = 0; i < results.length; i++) {
      const base64 = results[i].b64_json;
      if (!base64) {
        throw new Error(`OpenAI não retornou base64 para a imagem ${i + 1}`);
      }

      const img = await prisma.generatedImage.create({
        data: { userId, orderId, prompt, imageUrl: "" },
      });
      createdIds.push(img.id);

      const s3Key = buildGenerationKey(userId, img.id);

      if (isDev) console.log(`[generate] uploading image ${i + 1} to S3, key:`, s3Key);

      await uploadToS3(base64, s3Key);

      await prisma.generatedImage.update({
        where: { id: img.id },
        data: { s3Key },
      });

      const presignedUrl = await getPresignedUrl(s3Key);
      previews.push({ presignedUrl, imageId: img.id });

      if (isDev) console.log(`[generate] image ${i + 1} done — imageId:`, img.id);
    }
  } catch (err) {
    if (isDev) console.error("[generate] upload/db error:", err);
    // Clean up any orphan records created before the failure
    if (createdIds.length > 0) {
      await prisma.generatedImage
        .deleteMany({ where: { id: { in: createdIds } } })
        .catch(() => null);
    }
    throw err;
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { generationStatus: "COMPLETED" },
  });

  if (isDev) console.log("[generate] all done —", previews.length, "previews ready");

  return { previews };
}
