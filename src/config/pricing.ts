// Mantido para compatibilidade com o fluxo avulso atual
export const PRICE_PER_GENERATION_CENTS = 990;

// ── Definição de planos ────────────────────────────────────────────────────────

export type PlanId = "single" | "starter" | "seller";

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
    description: "1 produto • 2 prévias • escolha 1 imagem final",
  },
  {
    planId: "starter",
    label: "Pacote Inicial",
    amountCents: 2490,
    productsCount: 3,
    description: "3 produtos • 2 prévias por produto • 1 imagem final por produto",
    badge: "Mais escolhido",
  },
  {
    planId: "seller",
    label: "Pacote Vendedor",
    amountCents: 6990,
    productsCount: 10,
    description: "10 produtos • 2 prévias por produto • 1 imagem final por produto",
  },
];

export function getPlanById(planId: PlanId): PricingPlan | undefined {
  return PRICING_PLANS.find((p) => p.planId === planId);
}
