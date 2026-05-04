import { openai } from "@/lib/openai";
import { buildGenerationKey, uploadToS3, getPresignedUrl } from "@/lib/s3";
import { prisma } from "@/lib/prisma";

export async function generateProductImage(prompt: string, userId: string) {
  const response = await openai.images.generate({
    model: "gpt-image-2",
    prompt,
    n: 1,
    size: "1024x1024",
    quality: "high",
  });

  const base64 = response.data?.[0]?.b64_json;
  if (!base64) throw new Error("OpenAI não retornou imagem");

  // Cria o registro no banco primeiro para obter o ID
  const image = await prisma.generatedImage.create({
    data: { userId, prompt, imageUrl: "" },
  });

  const s3Key = buildGenerationKey(userId, image.id);

  await uploadToS3(base64, s3Key);

  // Atualiza o registro com a key do S3
  await prisma.generatedImage.update({
    where: { id: image.id },
    data: { s3Key },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { credits: { decrement: 1 } },
  });

  // Gera presigned URL válida por 1 hora
  const presignedUrl = await getPresignedUrl(s3Key);

  return { presignedUrl, imageId: image.id };
}
