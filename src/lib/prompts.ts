// Supported OpenAI image sizes
export type ImageSize = "1024x1024" | "1024x1536" | "1536x1024";

const DEFAULT_SIZE: ImageSize = "1024x1024";

// Size hint prefix embedded in the prompt string so the image service can
// determine the correct output dimensions without a separate DB field.
// Format: "[SIZE:WxH] " at the very beginning of the prompt.
const SIZE_HINT_RE = /^\[SIZE:(\d+x\d+)\] /;

export function extractSizeFromPrompt(prompt: string): ImageSize {
  const m = SIZE_HINT_RE.exec(prompt);
  if (!m) return DEFAULT_SIZE;
  const candidate = m[1];
  if (candidate === "1024x1536" || candidate === "1536x1024") return candidate;
  return DEFAULT_SIZE;
}

export function stripSizeHint(prompt: string): string {
  return prompt.replace(SIZE_HINT_RE, "");
}

// Internal preset IDs — separate from UI style IDs sent by GenerateClient
export type StylePresetId =
  | "marketplace_white"
  | "colored_bg"
  | "lifestyle_context"
  | "studio_premium"
  | "social_ad_clean"
  | "closeup_detail"
  // Dedicated preset — not yet mapped to any UI style; available for future exposure
  | "perfume_premium";

// Maps UI style IDs (GenerateClient) → internal preset IDs
const STYLE_ID_TO_PRESET: Record<string, StylePresetId> = {
  marketplace: "marketplace_white",
  "colored-bg": "colored_bg",
  scene: "lifestyle_context",
  premium: "studio_premium",
  social: "social_ad_clean",
};

export function getPresetName(style: string | null): StylePresetId {
  if (!style) return "marketplace_white";
  return STYLE_ID_TO_PRESET[style] ?? "marketplace_white";
}

// ── Global label/text preservation rule ───────────────────────────────────────
// Inserted into every preset to prevent the model from erasing or rewriting
// existing text, logos and printed design visible in the reference image.
const LABEL_PRESERVATION_RULE =
  "Preserve todo texto, rótulo, logo, marca impressa, nome do produto, design de embalagem, " +
  "instruções impressas e qualquer escrita visível no produto original exatamente como aparece na imagem de referência. " +
  "Não apague, não borre, não reescreva, não traduza, não corrija, não substitua, não estilize e não invente nenhum texto ou detalhe gráfico existente no produto. " +
  "O rótulo e o design impresso são parte da identidade do produto e devem permanecer visíveis e fiéis à referência. " +
  "Se não for possível reproduzir o texto perfeitamente, mantenha o produto o mais próximo possível da imagem original e evite alterar a região do rótulo.";

// ── Full self-contained prompts per preset ─────────────────────────────────────
// Each prompt combines product-preservation rules + style objective + restrictions.

const PRESET_PROMPTS: Record<Exclude<StylePresetId, "colored_bg">, string> = {
  marketplace_white:
    "Use a imagem enviada como referência principal e obrigatória do produto. " +
    "Gere uma foto profissional de marketplace com fundo branco limpo, mantendo somente o produto principal visível. " +
    "Remova completamente mãos, braços, pessoas, mesa, cenário, fundo original e qualquer elemento externo da foto original. " +
    "Preserve com máxima fidelidade o formato, cor, proporções, textura, material, acabamento, botões, entradas, rótulos, embalagem, câmeras, lentes, sensores, logo/marca existente e todos os detalhes reais do produto. " +
    LABEL_PRESERVATION_RULE + " " +
    "Não redesenhe o produto, não troque a cor, não altere o modelo, não invente partes novas, não remova partes existentes e não adicione textos novos, logos inexistentes, pessoas, mãos, acessórios ou elementos decorativos no cenário. " +
    "O produto deve ficar centralizado, bem iluminado, nítido, com aparência comercial profissional e sombra suave discreta no chão.",

  studio_premium:
    "Use a imagem enviada como referência principal e obrigatória do produto. " +
    "Gere uma foto publicitária premium de estúdio com iluminação dramática e sofisticada: rim light lateral ou traseiro definindo contornos, destaques controlados, sombra realista com profundidade e gradiente. " +
    "Use fundo rico e atmosférico em tons escuros e profundos — preto aveludado, azul-marinho profundo, grafite ou bordô escuro — com textura sutil de estúdio que transmita sofisticação. " +
    "Se o produto for um perfume, fragrância, colônia, eau de parfum ou cosmético de luxo: coloque-o sobre pedestal de mármore escuro, obsidiana ou vidro espelhado; adicione névoa fina e translúcida ao redor da base; use rim lighting dourado ou prateado que realce o frasco com brilho sofisticado; crie reflexo dramático na superfície e profundidade de campo cinematográfica, como uma campanha publicitária de perfume de alta gama. " +
    "Para qualquer produto: use composição editorial e aspiracional com espaço negativo intencional, reflexos sutis na superfície e visual de anúncio de marca premium. " +
    "Remova mãos, pessoas, mesa comum, fundo original e qualquer elemento externo desnecessário. " +
    "Preserve com máxima fidelidade o produto principal: formato exato, cor, proporções, textura, material, acabamento, tampa, ornamentos, rótulos, embalagem, câmeras, lentes, sensores, logo/marca existente e todos os detalhes reais. " +
    LABEL_PRESERVATION_RULE + " " +
    "Não altere o design do produto, não mude a cor, não invente partes, não remova elementos reais, não adicione textos novos, logos inexistentes, pessoas, mãos ou acessórios. " +
    "O produto deve continuar idêntico ao original, apresentado em composição publicitária sofisticada e visualmente impactante.",

  // Dedicated preset for fragrance / luxury cosmetics — not yet in UI
  perfume_premium:
    "Use a imagem enviada como referência principal e obrigatória do produto. " +
    "Gere uma imagem de campanha publicitária de luxo para perfume ou fragrância premium: coloque o frasco sobre pedestal de mármore negro, obsidiana ou vidro espelhado escuro; adicione névoa fina e translúcida sugerindo elegância e mistério ao redor da base; use rim lighting dourado ou platinado que realce o frasco com brilho sofisticado; crie fundo profundo e atmosférico em preto aveludado ou azul noite escuro; produza reflexo dramático e preciso na superfície do pedestal; use profundidade de campo cinematográfica com foco nítido no frasco e desfoque suave no fundo. " +
    "Composição editorial aspiracional com espaço negativo intencional, como uma campanha de alto orçamento de marca de perfume de luxo europeu. " +
    "Remova completamente mãos, pessoas, mesa comum, fundo original, embalagem externa e qualquer elemento estranho ao produto. " +
    "Preserve com máxima fidelidade o frasco: forma exata, cor do vidro, transparência, tampa, ornamentos, spray ou aplicador, rótulo, nome da marca impresso, acabamento metálico e todos os detalhes reais visíveis. " +
    LABEL_PRESERVATION_RULE + " " +
    "Não redesenhe o frasco, não altere a cor do vidro, não troque a tampa, não invente partes, não remova elementos existentes e não adicione texto novo, pessoas ou mãos. " +
    "O resultado deve parecer uma campanha visual de perfume de altíssimo padrão, com o produto absolutamente fiel ao original.",

  lifestyle_context:
    "Use a imagem enviada como referência principal e obrigatória do produto. " +
    "Gere uma foto lifestyle comercial colocando o produto em um cenário limpo, realista e contextual ao seu uso, mantendo o produto como foco principal. " +
    "Remova mãos, pessoas, bagunça e elementos externos da foto original que prejudiquem a apresentação. " +
    "O ambiente deve valorizar o produto sem competir com ele. " +
    "Preserve fielmente formato, cor, proporções, textura, material, acabamento, botões, entradas, rótulos, embalagem, câmeras, lentes, sensores, logo/marca existente e todos os detalhes reais do item. " +
    LABEL_PRESERVATION_RULE + " " +
    "Não altere o modelo, não troque a cor, não invente partes, não remova partes existentes, não adicione texto novo no cenário, logos inexistentes, pessoas, mãos ou acessórios que não existam no produto original. " +
    "O produto deve parecer fotografado profissionalmente em um cenário realista e vendável.",

  social_ad_clean:
    "[SIZE:1024x1536] " +
    "Use a imagem enviada como referência principal e obrigatória do produto. " +
    "Gere uma imagem comercial para redes sociais e anúncios digitais, com composição moderna, chamativa e visualmente atraente. " +
    "Preserve com máxima fidelidade o produto principal: formato, cor, proporções, textura, material, acabamento, rótulos, logo/marca existente e todos os detalhes reais do item. " +
    "Não altere o design do produto, não troque a cor, não invente partes novas, não remova partes reais e não adicione pessoas, mãos, acessórios, textos ou logos extras. " +
    LABEL_PRESERVATION_RULE + " " +
    "Crie um fundo moderno e publicitário, diferente de um fundo branco simples de catálogo. " +
    "Use iluminação mais impactante, gradientes suaves, contraste elegante, sombra realista, reflexos sutis e profundidade visual para dar aparência de criativo de anúncio premium para redes sociais. " +
    "O produto deve ficar em destaque absoluto, com composição limpa e vendável, aparência de anúncio profissional e espaço visual equilibrado. " +
    "O resultado deve parecer uma peça visual feita para Instagram e tráfego pago, não uma simples foto de marketplace.",

  closeup_detail:
    "Use a imagem enviada como referência principal e obrigatória do produto. " +
    "Gere uma foto close-up profissional destacando os detalhes reais do produto, como textura, acabamento, material, botões, lentes, rótulo, costura, embalagem, conectores ou partes visíveis. " +
    "Remova mãos, pessoas, bagunça, fundo original e qualquer elemento externo desnecessário. " +
    "Preserve fielmente formato, cor, proporções, design, textura, material, logo/marca existente e características originais. " +
    LABEL_PRESERVATION_RULE + " " +
    "Não altere o modelo, não troque cor, não invente partes, não remova detalhes existentes, não adicione texto novo, logos inexistentes, pessoas, mãos ou acessórios. " +
    "Use iluminação profissional, nitidez alta, fundo limpo e profundidade de campo suave, mantendo o produto reconhecível e fiel ao original.",
};

function buildColoredBgPrompt(colorMode: string | null, color: string | null): string {
  const bgSpec =
    colorMode === "specific" && color
      ? `fundo de cor ${color.toLowerCase()} sólido, limpo e uniforme, sem texturas ou gradientes`
      : "fundo de cor sólida escolhida pela IA para harmonizar e valorizar o produto, limpo e uniforme, sem texturas ou gradientes";

  return (
    `Use a imagem enviada como referência principal e obrigatória do produto. ` +
    `Gere uma foto profissional de produto com ${bgSpec}. ` +
    "Remova completamente mãos, braços, pessoas, mesa, cenário, fundo original e qualquer elemento externo da foto original. " +
    "Preserve com máxima fidelidade o formato, cor, proporções, textura, material, acabamento, botões, entradas, rótulos, embalagem, câmeras, lentes, sensores, logo/marca existente e todos os detalhes reais do produto. " +
    LABEL_PRESERVATION_RULE + " " +
    "Não redesenhe o produto, não troque a cor, não altere o modelo, não invente partes novas, não remova partes existentes e não adicione textos novos, logos inexistentes, pessoas, mãos, acessórios ou elementos decorativos no cenário. " +
    "O produto deve ficar centralizado, bem iluminado, nítido, com aparência comercial profissional e sombra suave discreta no chão."
  );
}

export function getStylePrompt(
  style: string | null,
  colorMode: string | null,
  color: string | null,
): string {
  const preset = getPresetName(style);

  if (preset === "colored_bg") {
    return buildColoredBgPrompt(colorMode, color);
  }

  return PRESET_PROMPTS[preset];
}
