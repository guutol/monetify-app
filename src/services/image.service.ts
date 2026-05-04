import { openai } from "@/lib/openai";
import { buildGenerationKey, uploadToS3, getPresignedUrl } from "@/lib/s3";
import { prisma } from "@/lib/prisma";

export async function generateProductImage(prompt: string, userId: string, orderId: string) {
  const response = await openai.images.generate({
    model: "gpt-image-2",
    prompt,
    n: 1,
    size: "1024x1024",
    quality: "high",
  });

  const base64 = response.data?.[0]?.b64_json;
  if (!base64) throw new Error("OpenAI não retornou imagem");

  const image = await prisma.generatedImage.create({
    data: { userId, prompt, imageUrl: "" },
  });

  const s3Key = buildGenerationKey(userId, image.id);

  await uploadToS3(base64, s3Key);

  await prisma.$transaction([
    prisma.generatedImage.update({
      where: { id: image.id },
      data: { s3Key },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: {
        imageId: image.id,
        generationStatus: "COMPLETED",
      },
    }),
  ]);

  const presignedUrl = await getPresignedUrl(s3Key);

  return { presignedUrl, imageId: image.id };
}
