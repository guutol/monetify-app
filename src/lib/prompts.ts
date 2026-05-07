export function getStylePrompt(
  style: string | null,
  colorMode: string | null,
  color: string | null,
): string {
  switch (style) {
    case "marketplace":
      return (
        "Pure white background (#FFFFFF), product perfectly centered, " +
        "soft uniform diffuse lighting from all sides eliminating harsh shadows, " +
        "subtle soft drop shadow directly beneath the product to anchor it, " +
        "clean minimalist composition with no props or distractions, " +
        "professional e-commerce style suitable for Shopee, Mercado Livre, Amazon and product catalogs, " +
        "high-resolution crisp edges, no gradients or textures on background."
      );

    case "colored-bg":
      if (colorMode === "specific" && color) {
        return (
          `Flat solid ${color.toLowerCase()} colored background, smooth and even with no texture or gradient, ` +
          "product perfectly centered and prominently featured, " +
          "soft diffuse lighting that complements the background color, " +
          "subtle shadow at the base of the product, " +
          "clean commercial product photography style."
        );
      }
      return (
        "Flat solid background color chosen by AI to harmonize and complement the product's colors and branding, " +
        "smooth and even with no texture or gradient, " +
        "product perfectly centered and prominently featured, " +
        "soft diffuse lighting, subtle shadow at the base of the product, " +
        "clean commercial product photography style."
      );

    case "scene":
      return (
        "Contextual lifestyle background environment that naturally matches the product type and category, " +
        "product positioned as the clear hero and focal point of the composition, " +
        "professional natural or studio lighting that enhances the product, " +
        "background softly blurred or stylized so it complements without competing with the product, " +
        "editorial product photography aesthetic, high-end commercial quality."
      );

    case "premium":
      return (
        "Dark or deep-toned studio background with rich dramatic atmosphere, " +
        "sophisticated directional lighting with elegant highlights and controlled shadows creating depth, " +
        "luxury brand editorial style, cinematic and aspirational mood, " +
        "product positioned with intentional negative space, " +
        "high-end fashion or cosmetics brand photography aesthetic, " +
        "no props, pure product focus with premium feel."
      );

    case "social":
      return (
        "Vibrant eye-catching composition optimized for social media engagement, " +
        "bold dynamic background — gradient, colorful abstract, or lifestyle scene — " +
        "that creates strong visual contrast and stops the scroll, " +
        "product prominently featured with energetic styling, " +
        "bright and punchy lighting, Instagram and TikTok Shop aesthetic, " +
        "suitable for ads, stories and feed posts, modern trendy visual style."
      );

    default:
      return "";
  }
}
