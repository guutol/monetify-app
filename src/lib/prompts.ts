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
    "Gere uma foto publicitária premium de estúdio com iluminação dramática e sofisticada: rim light lateral ou traseiro definindo contornos, destaques controlados, sombra realista com profundidade e gradiente. " +
    "Use fundo rico e atmosférico em tons escuros e profundos — preto aveludado, azul-marinho profundo, grafite ou bordô escuro — com textura sutil de estúdio que transmita sofisticação. " +
    "Se o produto for um perfume, fragrância, colônia, eau de parfum ou cosmético de luxo: coloque-o sobre pedestal de mármore escuro, obsidiana ou vidro espelhado; adicione névoa fina e translúcida ao redor da base; use rim lighting dourado ou prateado que realce o frasco com brilho sofisticado; crie reflexo dramático na superfície e profundidade de campo cinematográfica, como uma campanha publicitária de perfume de alta gama. " +
    "Para qualquer produto: use composição editorial e aspiracional com espaço negativo intencional, reflexos sutis na superfície e visual de anúncio de marca premium. " +
    "Remova mãos, pessoas, mesa comum, fundo original e qualquer elemento externo desnecessário. " +
    "Preserve com máxima fidelidade o produto principal: formato exato, cor, proporções, textura, material, acabamento, tampa, ornamentos, rótulos, embalagem, câmeras, lentes, sensores, logo/marca existente e todos os detalhes reais. " +
    "Não altere o design do produto, não mude a cor, não invente partes, não remova elementos reais, não adicione textos, logos inexistentes, pessoas, mãos ou acessórios. " +
    "O produto deve continuar idêntico ao original, apresentado em composição publicitária sofisticada e visualmente impactante.",

  // Dedicated preset for fragrance / luxury cosmetics — not yet in UI
  perfume_premium:
    "Use a imagem enviada como referência principal e obrigatória do produto. " +
    "Gere uma imagem de campanha publicitária de luxo para perfume ou fragrância premium: coloque o frasco sobre pedestal de mármore negro, obsidiana ou vidro espelhado escuro; adicione névoa fina e translúcida sugerindo elegância e mistério ao redor da base; use rim lighting dourado ou platinado que realce o frasco com brilho sofisticado; crie fundo profundo e atmosférico em preto aveludado ou azul noite escuro; produza reflexo dramático e preciso na superfície do pedestal; use profundidade de campo cinematográfica com foco nítido no frasco e desfoque suave no fundo. " +
    "Composição editorial aspiracional com espaço negativo intencional, como uma campanha de alto orçamento de marca de perfume de luxo europeu. " +
    "Remova completamente mãos, pessoas, mesa comum, fundo original, embalagem externa e qualquer elemento estranho ao produto. " +
    "Preserve com máxima fidelidade o frasco: forma exata, cor do vidro, transparência, tampa, ornamentos, spray ou aplicador, rótulo, nome da marca impresso, acabamento metálico e todos os detalhes reais visíveis. " +
    "Não redesenhe o frasco, não altere a cor do vidro, não troque a tampa, não invente partes, não remova elementos existentes e não adicione texto, pessoas ou mãos. " +
    "O resultado deve parecer uma campanha visual de perfume de altíssimo padrão, com o produto absolutamente fiel ao original.",

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
