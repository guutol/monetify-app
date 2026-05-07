"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PRICING_PLANS, type PricingPlan } from "@/config/pricing";

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function savingsPct(plan: PricingPlan): number {
  const pricePerUnit = plan.amountCents / plan.productsCount;
  return Math.round((1 - pricePerUnit / 990) * 100);
}

function pluralize(n: number, singular: string, plural: string) {
  return n === 1 ? singular : plural;
}

interface Props {
  initialCredits: number;
}

export function PlansClient({ initialCredits }: Props) {
  const router = useRouter();
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePackagePurchase(planId: "starter" | "seller") {
    if (loadingPlanId) return;
    setError(null);
    setLoadingPlanId(planId);

    try {
      const res = await fetch("/api/payments/checkout/package", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erro ao criar cobrança. Tente novamente.");
        return;
      }

      router.push(`/pay/${data.orderId}`);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoadingPlanId(null);
    }
  }

  const packages = PRICING_PLANS.filter((p) => p.planId !== "single");
  const single = PRICING_PLANS.find((p) => p.planId === "single")!;

  return (
    <div className="mx-auto w-full max-w-4xl min-w-0">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm font-semibold text-emerald-400">Monetify</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
          Escolha seu pacote
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Compre produtos disponíveis e gere imagens profissionais quando quiser.
        </p>
      </div>

      {/* Current balance banner */}
      <div className="mb-6 flex min-w-0 items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-emerald-400"
          >
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        </div>
        <p className="min-w-0 text-sm text-zinc-300">
          Você tem{" "}
          <span className="font-bold text-white">
            {initialCredits}{" "}
            {pluralize(initialCredits, "produto disponível", "produtos disponíveis")}
          </span>
          {initialCredits > 0 && (
            <>
              {" "}—{" "}
              <Link href="/generate" className="text-emerald-400 underline-offset-2 hover:underline">
                gerar agora
              </Link>
            </>
          )}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Avulso */}
        <div className="flex min-w-0 flex-col rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="mb-1 flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-zinc-100">{single.label}</p>
          </div>
          <p className="mb-4 text-xs text-zinc-500">{single.description}</p>

          <div className="mb-5 mt-auto">
            <span className="text-2xl font-bold text-white">{formatBRL(single.amountCents)}</span>
            <p className="mt-0.5 text-xs text-zinc-500">por produto</p>
          </div>

          <Link
            href="/generate"
            className="flex w-full items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-700 hover:text-white"
          >
            Comprar avulso
          </Link>
        </div>

        {/* Packages */}
        {packages.map((plan) => {
          const pct = savingsPct(plan);
          const isLoading = loadingPlanId === plan.planId;
          const isBestValue = plan.planId === "seller";
          const isMostChosen = plan.planId === "starter";

          return (
            <div
              key={plan.planId}
              className={`flex min-w-0 flex-col rounded-2xl border p-5 ${
                isBestValue
                  ? "border-emerald-500/40 bg-emerald-500/5 ring-1 ring-emerald-500/20"
                  : "border-zinc-800 bg-zinc-900"
              }`}
            >
              <div className="mb-1 flex min-w-0 items-start justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-bold text-zinc-100">{plan.label}</p>
                {isMostChosen && (
                  <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                    Popular
                  </span>
                )}
                {isBestValue && (
                  <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400">
                    Melhor valor
                  </span>
                )}
              </div>

              <p className="mb-1 text-xs text-zinc-500">{plan.description}</p>

              {pct > 0 && (
                <p className="mb-4 text-xs font-semibold text-emerald-400">
                  Economize {pct}% por produto
                </p>
              )}

              <div className="mb-5 mt-auto">
                <span className="text-2xl font-bold text-white">{formatBRL(plan.amountCents)}</span>
                <span className="ml-1.5 text-xs text-zinc-500">
                  ({formatBRL(Math.round(plan.amountCents / plan.productsCount))}/produto)
                </span>
              </div>

              <button
                type="button"
                disabled={!!loadingPlanId}
                onClick={() => handlePackagePurchase(plan.planId as "starter" | "seller")}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                  isBestValue
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    : "border border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                }`}
              >
                {isLoading ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Criando cobrança...
                  </>
                ) : (
                  "Comprar pacote"
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Fine print */}
      <p className="mt-6 text-center text-xs text-zinc-600">
        Pagamento via PIX. Sem assinatura. Produtos disponíveis não expiram.
      </p>
    </div>
  );
}
