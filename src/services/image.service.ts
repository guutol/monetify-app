import { openai } from "@/lib/openai";
import { uploadImageToS3 } from "@/lib/s3";
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

  const { url, key } = await uploadImageToS3(base64, userId);

  await prisma.user.update({
    where: { id: userId },
    data: { credits: { decrement: 1 } },
  });

  const image = await prisma.generatedImage.create({
    data: {
      userId,
      prompt,
      imageUrl: url,
      s3Key: key,
    },
  });

  return { imageUrl: url, imageId: image.id };
}
