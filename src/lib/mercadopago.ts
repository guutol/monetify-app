import { MercadoPagoConfig, Payment } from "mercadopago";

function getPaymentClient(): Payment {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");
  const client = new MercadoPagoConfig({ accessToken: token });
  return new Payment(client);
}

function getToken(): string {
  const t = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!t) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");
  return t;
}

function tokenType(): string {
  const t = process.env.MERCADOPAGO_ACCESS_TOKEN ?? "";
  if (!t) return "MISSING";
  if (t.startsWith("TEST-")) return "TEST";
  if (t.startsWith("APP_USR-")) return "APP_USR";
  return "UNKNOWN";
}

export interface PixPaymentResult {
  paymentId: string;
  brCode: string;
  brCodeBase64: string; // data URL (data:image/png;base64,...)
  expiresAt: string; // ISO datetime
}

// PIX expira em 30 minutos por padrão
const PIX_TTL_MS = 30 * 60 * 1000;

export async function createPixPayment(opts: {
  amountCents: number;
  orderId: string;
  payerEmail: string;
  description: string;
}): Promise<PixPaymentResult> {
  const token = getToken();
  const expiresAt = new Date(Date.now() + PIX_TTL_MS);
  const transactionAmount = opts.amountCents / 100;

  console.log("[mercadopago] createPixPayment", {
    orderId:          opts.orderId,
    amountCents:      opts.amountCents,
    transactionAmount,
    payerEmail:       opts.payerEmail,
    tokenType:        tokenType(),
    dateOfExpiration: expiresAt.toISOString(),
  });

  const body = JSON.stringify({
    transaction_amount: transactionAmount,
    payment_method_id: "pix",
    payer: { email: opts.payerEmail },
    external_reference: opts.orderId,
    description: opts.description,
    date_of_expiration: expiresAt.toISOString(),
  });

  let res: Response;
  try {
    res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": opts.orderId,
      },
      body,
    });
  } catch (err) {
    console.error("[mercadopago] fetch network error:", err instanceof Error ? err.message : String(err));
    throw err;
  }

  const rawBody = await res.text();
  console.log("[mercadopago] resposta raw:", {
    status:     res.status,
    statusText: res.statusText,
    body:       rawBody.slice(0, 1000),
  });

  if (!res.ok) {
    throw new Error(`Mercado Pago HTTP ${res.status}: ${rawBody.slice(0, 500)}`);
  }

  if (!rawBody) {
    throw new Error(`Mercado Pago: resposta vazia com status ${res.status}`);
  }

  let result: Record<string, unknown>;
  try {
    result = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    throw new Error(`Mercado Pago: JSON inválido — ${rawBody.slice(0, 200)}`);
  }

  const txData = (result.point_of_interaction as Record<string, unknown> | undefined)
    ?.transaction_data as Record<string, unknown> | undefined;
  const qrCode = txData?.qr_code as string | undefined;

  if (!result.id || !qrCode) {
    console.error("[mercadopago] resposta sem id/qrCode:", {
      id:           result.id,
      status:       result.status,
      statusDetail: result.status_detail,
      error:        result.error,
      message:      result.message,
    });
    throw new Error("Mercado Pago: resposta inválida ou QR Code PIX não disponível");
  }

  console.log("[mercadopago] payment criado:", {
    paymentId:    result.id,
    status:       result.status,
    statusDetail: result.status_detail,
  });

  const rawBase64 = (txData?.qr_code_base64 as string | undefined) ?? "";
  const brCodeBase64 = rawBase64 ? `data:image/png;base64,${rawBase64}` : "";

  return {
    paymentId:  String(result.id),
    brCode:     qrCode,
    brCodeBase64,
    expiresAt:  (result.date_of_expiration as string | undefined) ?? expiresAt.toISOString(),
  };
}

export async function getPaymentById(paymentId: string) {
  const payment = getPaymentClient();
  return payment.get({ id: paymentId });
}
