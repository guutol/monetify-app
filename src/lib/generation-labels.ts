export type GenerationLabel = { title: string; description: string };

export function resolveGenerationLabel(prompt: string | null): GenerationLabel {
  if (!prompt) return { title: "Imagem gerada", description: "" };

  const p = prompt.toLowerCase();

  // New prompts (English keywords)
  if (p.startsWith("pure white background"))
    return { title: "Marketplace / fundo branco", description: "Produto centralizado com fundo branco e sombra suave." };
  if (p.startsWith("flat solid"))
    return { title: "Fundo colorido", description: "Imagem com fundo colorido para destacar o produto." };
  if (p.startsWith("contextual lifestyle"))
    return { title: "Cenário que combina com o produto", description: "Produto em um cenário profissional." };
  if (p.startsWith("dark or deep-toned"))
    return { title: "Estilo premium", description: "Visual elegante com aparência de marca." };
  if (p.startsWith("vibrant eye-catching"))
    return { title: "Redes sociais", description: "Imagem chamativa para anúncios e posts." };

  // Old prompts (Portuguese keywords) — backward compat
  if (p.includes("fundo branco"))
    return { title: "Marketplace / fundo branco", description: "Produto centralizado com fundo branco e sombra suave." };
  if (p.includes("fundo colorido") || p.includes("cor lisa"))
    return { title: "Fundo colorido", description: "Imagem com fundo colorido para destacar o produto." };
  if (p.includes("cenário") || p.includes("fundo contextual"))
    return { title: "Cenário que combina com o produto", description: "Produto em um cenário profissional." };
  if (p.includes("iluminação sofisticada") || p.includes("premium"))
    return { title: "Estilo premium", description: "Visual elegante com aparência de marca." };
  if (p.includes("redes sociais") || p.includes("tiktok"))
    return { title: "Redes sociais", description: "Imagem chamativa para anúncios e posts." };

  return { title: "Imagem gerada", description: "" };
}
