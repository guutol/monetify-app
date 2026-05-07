// Internal preset IDs — separate from UI style IDs sent by GenerateClient
export type StylePresetId =
  | "marketplace_white"
  | "colored_bg"
  | "lifestyle_context"
  | "studio_premium"
  | "social_ad_clean"
  | "closeup_detail";

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

// ── Full self-contained prompts per preset ─────────────────────────────────────
// Each prompt combines product-preservation rules + style objective + restrictions.

const PRESET_PROMPTS: Record<Exclude<StylePresetId, "colored_bg">, string> = {
  marketplace_white:
    "Use a imagem enviada como referência principal e obrigatória do produto. " +
    "Gere uma foto profissional de marketplace com fundo branco limpo, mantendo somente o produto principal visível. " +
    "Remova completamente mãos, braços, pessoas, mesa, cenário, fundo original e qualquer elemento externo da foto original. " +
    "Preserve com máxima fidelidade o formato, cor, proporções, textura, material, acabamento, botões, entradas, rótulos, embalagem, câmeras, lentes, sensores, logo/marca existente e todos os detalhes reais do produto. " +
    "Não redesenhe o produto, não troque a cor, não altere o modelo, não invente partes novas, não remova partes existentes e não adicione textos, logos, pessoas, mãos, acessórios ou elementos decorativos. " +
    "O produto deve ficar centralizado, bem iluminado, nítido, com aparência comercial profissional e sombra suave discreta no chão.",

  studio_premium:
    "Use a imagem enviada como referência principal e obrigatória do produto. " +
    "Gere uma foto profissional de estúdio premium, com iluminação suave e sofisticada, fundo limpo e elegante, composição refinada e sombra realista. " +
    "Remova mãos, pessoas, mesa, bagunça, fundo original e qualquer elemento externo desnecessário. " +
    "Preserve com máxima fidelidade o produto principal: mesmo formato, cor, proporções, textura, material, acabamento, botões, entradas, rótulos, embalagem, câmeras, lentes, sensores, logo/marca existente e todos os detalhes reais. " +
    "Não altere o design do produto, não mude a cor, não invente partes, não remova elementos reais, não adicione textos, logos inexistentes, pessoas, mãos ou acessórios. " +
    "O resultado deve parecer uma foto publicitária profissional, mas o produto deve continuar idêntico ao original.",

  lifestyle_context:
    "Use a imagem enviada como referência principal e obrigatória do produto. " +
    "Gere uma foto lifestyle comercial colocando o produto em um cenário limpo, realista e contextual ao seu uso, mantendo o produto como foco principal. " +
    "Remova mãos, pessoas, bagunça e elementos externos da foto original que prejudiquem a apresentação. " +
    "O ambiente deve valorizar o produto sem competir com ele. " +
    "Preserve fielmente formato, cor, proporções, textura, material, acabamento, botões, entradas, rótulos, embalagem, câmeras, lentes, sensores, logo/marca existente e todos os detalhes reais do item. " +
    "Não altere o modelo, não troque a cor, não invente partes, não remova partes existentes, não adicione texto, logos inexistentes, pessoas, mãos ou acessórios que não existam no produto original. " +
    "O produto deve parecer fotografado profissionalmente em um cenário realista e vendável.",

  social_ad_clean:
    "Use a imagem enviada como referência principal e obrigatória do produto. " +
    "Gere uma imagem comercial clean para anúncio digital e redes sociais, com fundo moderno, limpo e visualmente atraente, mantendo o produto centralizado e em destaque. " +
    "Remova mãos, pessoas, mesa, cenário antigo, fundo original e qualquer elemento externo que prejudique a apresentação comercial. " +
    "Preserve exatamente o produto original: formato, cor, proporções, textura, material, acabamento, botões, entradas, rótulos, embalagem, câmeras, sensores, logo/marca existente e partes visíveis. " +
    "Não altere o produto, não troque cor, não invente elementos, não remova partes reais, não adicione texto, logos inexistentes, pessoas, mãos ou acessórios. " +
    "A imagem deve parecer profissional, moderna e pronta para divulgação, mas sem qualquer texto.",

  closeup_detail:
    "Use a imagem enviada como referência principal e obrigatória do produto. " +
    "Gere uma foto close-up profissional destacando os detalhes reais do produto, como textura, acabamento, material, botões, lentes, rótulo, costura, embalagem, conectores ou partes visíveis. " +
    "Remova mãos, pessoas, bagunça, fundo original e qualquer elemento externo desnecessário. " +
    "Preserve fielmente formato, cor, proporções, design, textura, material, logo/marca existente e características originais. " +
    "Não altere o modelo, não troque cor, não invente partes, não remova detalhes existentes, não adicione texto, logos inexistentes, pessoas, mãos ou acessórios. " +
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
    "Não redesenhe o produto, não troque a cor, não altere o modelo, não invente partes novas, não remova partes existentes e não adicione textos, logos, pessoas, mãos, acessórios ou elementos decorativos. " +
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
