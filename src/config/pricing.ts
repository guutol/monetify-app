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
    amountCents: 3990,
    productsCount: 5,
    description: "5 imagens • 2 prévias por produto • 1 imagem final por produto",
  },
  {
    planId: "pack_15",
    label: "Pacote 15 imagens",
    amountCents: 9990,
    productsCount: 15,
    description: "15 imagens • 2 prévias por produto • 1 imagem final por produto",
    badge: "Mais vendido",
  },
  {
    planId: "pack_30",
    label: "Pacote 30 imagens",
    amountCents: 15990,
    productsCount: 30,
    description: "30 imagens • 2 prévias por produto • 1 imagem final por produto",
    badge: "Melhor custo-benefício",
  },
];

export function getPlanById(planId: PlanId): PricingPlan | undefined {
  return PRICING_PLANS.find((p) => p.planId === planId);
}
