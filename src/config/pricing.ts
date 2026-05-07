// Mantido para compatibilidade com o fluxo avulso atual
export const PRICE_PER_GENERATION_CENTS = 990;

// ── Definição de planos ────────────────────────────────────────────────────────

export type PlanId = "single" | "pack_5" | "pack_15" | "pack_30";

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
    description: "1 imagem • 2 prévias • escolha 1 imagem final",
  },
  {
    planId: "pack_5",
    label: "Pacote 5 imagens",
    amountCents: 3490,
    productsCount: 5,
    description: "5 imagens • 2 prévias por produto • 1 imagem final por produto",
  },
  {
    planId: "pack_15",
    label: "Pacote 15 imagens",
    amountCents: 7990,
    productsCount: 15,
    description: "15 imagens • 2 prévias por produto • 1 imagem final por produto",
    badge: "Mais popular",
  },
  {
    planId: "pack_30",
    label: "Pacote 30 imagens",
    amountCents: 12990,
    productsCount: 30,
    description: "30 imagens • 2 prévias por produto • 1 imagem final por produto",
    badge: "Melhor valor",
  },
];

export function getPlanById(planId: PlanId): PricingPlan | undefined {
  return PRICING_PLANS.find((p) => p.planId === planId);
}
