export const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "";
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "";

interface BuildSupportUrlOptions {
  orderId?: string | null;
  imageId?: string | null;
  userEmail?: string | null;
}

export function buildSupportWhatsAppUrl(opts: BuildSupportUrlOptions = {}): string | null {
  if (!SUPPORT_WHATSAPP) return null;

  const { orderId, imageId, userEmail } = opts;
  const hasContext = !!(orderId || imageId || userEmail);

  let message: string;
  if (hasContext) {
    const lines = [
      "Olá! Quero solicitar suporte ou reembolso de um pedido no Monetify.",
      "",
    ];
    if (orderId) lines.push(`Pedido: ${orderId}`);
    if (imageId) lines.push(`Imagem: ${imageId}`);
    if (userEmail) lines.push(`E-mail da conta: ${userEmail}`);
    lines.push("", "Motivo:");
    message = lines.join("\n");
  } else {
    message = "Olá! Preciso de ajuda com o Monetify.";
  }

  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`;
}
