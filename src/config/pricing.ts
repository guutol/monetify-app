// Mantido para compatibilidade com o fluxo avulso atual
export const PRICE_PER_GENERATION_CENTS = 990;

// ── Definição de planos ────────────────────────────────────────────────────────

export type PlanId = "single" | "pack_5" | "pack_10" | "pack_20";

export interface PricingPlan {
  planId: PlanId;
  label: string;
  amountCents: number;
  productsCount: number;
  description: string;
  badge?: string;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    planId: "single",
    label: "Avulso",
    amountCents: 990,
    productsCount: 1,
    description: "1 imagem gerada com IA • qualidade alta",
  },
  {
    planId: "pack_5",
    label: "Começar",
    amountCents: 3990,
    productsCount: 5,
    description: "Ideal para testar com poucos produtos",
  },
  {
    planId: "pack_10",
    label: "Vendedor",
    amountCents: 6990,
    productsCount: 10,
    description: "Melhor custo-benefício para vendedores",
    badge: "Mais vendido",
  },
  {
    planId: "pack_20",
    label: "Loja",
    amountCents: 11990,
    productsCount: 20,
    description: "Para lojas com mais produtos no catálogo",
  },
];

// Legacy plan data — não oferecidos na UI, apenas para exibição de pedidos antigos
const LEGACY_PLAN_DATA: Record<string, { label: string; productsCount: number }> = {
  pack_15: { label: "Pacote 15 imagens", productsCount: 15 },
  pack_30: { label: "Pacote 30 imagens", productsCount: 30 },
};

export function getPlanById(planId: string): PricingPlan | undefined {
  const found = PRICING_PLANS.find((p) => p.planId === planId);
  if (found) return found;
  const legacy = LEGACY_PLAN_DATA[planId];
  if (!legacy) return undefined;
  // Retorna shape mínimo para exibição de pedidos antigos (amount=0 — não usado para cobranças)
  return { planId: planId as PlanId, ...legacy, amountCents: 0, description: "" };
}
