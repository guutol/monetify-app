import crypto from "node:crypto";
import { NextRequest } from "next/server";

/**
 * Valida o secret enviado na query string do webhook.
 *
 * A AbacatePay suporta dois mecanismos de segurança simultâneos:
 *   1. Secret na URL  → validado aqui
 *   2. HMAC-SHA256    → validado em verifyAbacatePaySignature
 *
 * Em produção, ambos são obrigatórios. Em desenvolvimento, são opcionais
 * (ignorados se as variáveis de ambiente não estiverem configuradas).
 *
 * Como obter: Dashboard AbacatePay → Webhooks → [seu webhook] → URL secret
 */
export function verifyWebhookUrlSecret(req: NextRequest): boolean {
  const expected = process.env.ABACATEPAY_WEBHOOK_URL_SECRET;
  if (!expected) return false;
  const provided = req.nextUrl.searchParams.get("secret") ?? "";
  return provided === expected;
}

/**
 * Valida o header X-Webhook-Signature usando HMAC-SHA256 + Base64.
 * Usa timingSafeEqual para evitar timing attacks.
 *
 * Em produção: obrigatório — AbacatePay recomenda URL secret + HMAC juntos.
 * Em desenvolvimento: opcional (ignorado se ABACATEPAY_WEBHOOK_SIGNATURE_KEY
 * não estiver configurado).
 *
 * TODO: Confirmar no dashboard AbacatePay se ABACATEPAY_WEBHOOK_SIGNATURE_KEY
 * é uma chave por-conta ou a chave global exibida na documentação deles
 * (chamada de ABACATEPAY_PUBLIC_KEY). Cole o valor correto no .env.local.
 * Referência: https://docs.abacatepay.com/pages/webhooks
 */
export function verifyAbacatePaySignature(rawBody: string, signature: string): boolean {
  const key = process.env.ABACATEPAY_WEBHOOK_SIGNATURE_KEY;
  if (!key) return false;

  const expected = crypto
    .createHmac("sha256", key)
    .update(Buffer.from(rawBody, "utf8"))
    .digest("base64");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);

  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
