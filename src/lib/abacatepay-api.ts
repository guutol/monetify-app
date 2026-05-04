const BASE_URL = "https://api.abacatepay.com";

const isDev = process.env.NODE_ENV !== "production";

interface PixChargeInput {
  amount: number;
  externalId?: string;
}

interface PixChargeResult {
  id: string;
  brCode: string;
  brCodeBase64: string;
  expiresAt: string;
  devMode: boolean;
}

export async function createPixCharge(input: PixChargeInput): Promise<PixChargeResult> {
  const apiKey = process.env.ABACATEPAY_API_KEY;
  if (!apiKey) throw new Error("ABACATEPAY_API_KEY não configurado");

  const endpoint = `${BASE_URL}/v2/transparents/create`;

  const payload = {
    method: "PIX",
    data: {
      amount: input.amount,
      ...(input.externalId
        ? { metadata: { orderId: input.externalId } }
        : {}),
    },
  };

  if (isDev) {
    console.log("[abacatepay] POST", endpoint);
    console.log("[abacatepay] payload:", JSON.stringify(payload, null, 2));
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const responseText = await res.text();

  if (isDev) {
    console.log("[abacatepay] status:", res.status);
    console.log("[abacatepay] response:", responseText);
  }

  if (!res.ok) {
    throw new Error(`AbacatePay error ${res.status}: ${responseText}`);
  }

  let json: { data?: Record<string, unknown>; success?: boolean };
  try {
    json = JSON.parse(responseText);
  } catch {
    throw new Error(`AbacatePay retornou resposta inválida: ${responseText}`);
  }

  const data = json.data;
  if (!data) throw new Error("AbacatePay: resposta sem campo 'data'");

  return {
    id: data.id as string,
    brCode: data.brCode as string,
    brCodeBase64: data.brCodeBase64 as string,
    expiresAt: data.expiresAt as string,
    devMode: (data.devMode as boolean) ?? false,
  };
}
