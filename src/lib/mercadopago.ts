import { MercadoPagoConfig, Payment } from "mercadopago";

function getPaymentClient(): Payment {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");
  const client = new MercadoPagoConfig({ accessToken: token });
  return new Payment(client);
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
  const payment = getPaymentClient();

  const expiresAt = new Date(Date.now() + PIX_TTL_MS);

  const result = await payment.create({
    body: {
      transaction_amount: opts.amountCents / 100,
      payment_method_id: "pix",
      payer: { email: opts.payerEmail },
      external_reference: opts.orderId,
      description: opts.description,
      date_of_expiration: expiresAt.toISOString(),
    },
    requestOptions: { idempotencyKey: opts.orderId },
  });

  const txData = result.point_of_interaction?.transaction_data;
  const qrCode = txData?.qr_code;

  if (!result.id || !qrCode) {
    throw new Error("Mercado Pago: resposta inválida ou QR Code PIX não disponível");
  }

  const rawBase64 = txData?.qr_code_base64 ?? "";
  const brCodeBase64 = rawBase64 ? `data:image/png;base64,${rawBase64}` : "";

  return {
    paymentId: String(result.id),
    brCode: qrCode,
    brCodeBase64,
    expiresAt: result.date_of_expiration ?? expiresAt.toISOString(),
  };
}

export async function getPaymentById(paymentId: string) {
  const payment = getPaymentClient();
  return payment.get({ id: paymentId });
}
