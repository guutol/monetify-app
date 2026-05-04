import crypto from "node:crypto";
import { NextRequest } from "next/server";

/**
 * Validates the URL secret passed as a query param on the webhook endpoint.
 *
 * Set up: when creating the webhook in the AbacatePay dashboard, you can add
 * a secret to the URL (e.g. ?secret=VALUE). Store that value in
 * ABACATEPAY_WEBHOOK_URL_SECRET.
 *
 * Dashboard path: AbacatePay → Webhooks → [seu webhook] → secret da URL
 */
export function verifyWebhookUrlSecret(req: NextRequest): boolean {
  const expected = process.env.ABACATEPAY_WEBHOOK_URL_SECRET;
  if (!expected) return false;
  const provided = req.nextUrl.searchParams.get("secret") ?? "";
  return provided === expected;
}

/**
 * Validates the X-Webhook-Signature header using HMAC-SHA256 + Base64.
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * TODO: Confirm in the AbacatePay dashboard whether ABACATEPAY_WEBHOOK_SIGNATURE_KEY
 * is a per-account key or the global key shown in their public documentation.
 * Their docs show a fixed constant (ABACATEPAY_PUBLIC_KEY), but this may be
 * account-specific. Until confirmed, this validation is opt-in (runs only when
 * ABACATEPAY_WEBHOOK_SIGNATURE_KEY is set in the environment).
 *
 * Reference: https://docs.abacatepay.com/pages/webhooks
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
