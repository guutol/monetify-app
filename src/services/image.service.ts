import { openai } from "@/lib/openai";
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

  // Decrementa crédito do usuário
  await prisma.user.update({
    where: { id: userId },
    data: { credits: { decrement: 1 } },
  });

  // Salva registro no histórico (imageUrl será atualizado com S3 na próxima etapa)
  const image = await prisma.generatedImage.create({
    data: {
      userId,
      prompt,
      imageUrl: "", // substituído pelo URL do S3 na próxima etapa
    },
  });

  return { base64, imageId: image.id };
}
