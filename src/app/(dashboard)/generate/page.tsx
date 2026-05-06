"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const STYLE_CHIPS = [
  "fundo branco limpo",
  "iluminação de estúdio",
  "produto centralizado",
  "alta resolução",
  "ângulo frontal",
  "luz natural suave",
];

export default function GeneratePage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function appendChip(chip: string) {
    setPrompt((prev) => {
      const trimmed = prev.trimEnd();
      if (!trimmed) return chip.charAt(0).toUpperCase() + chip.slice(1);
      if (trimmed.endsWith(",")) return `${trimmed} ${chip}`;
      return `${trimmed}, ${chip}`;
    });
  }

  async function handleCheckout() {
    if (prompt.trim().length < 5 || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erro ao criar cobrança");
        return;
      }

      router.push(`/pay/${data.orderId}`);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  const canSubmit = prompt.trim().length >= 5 && !isLoading;

  return (
    <div className="mx-auto w-full max-w-5xl min-w-0">

        {/* Page header */}
        <div className="mb-8">
          <p className="text-sm font-semibold text-emerald-400">Monetify</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
            Gere sua imagem profissional
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Descreva o produto, escolha o estilo e avance para o pagamento via PIX.
          </p>
        </div>

        {/* Info alert */}
        <div className="mb-7 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4">
          <p className="text-xs font-semibold text-emerald-400">
            Versão atual por descrição
          </p>
          <p className="mt-1 text-xs leading-relaxed text-emerald-300/70">
            Nesta etapa, descreva o produto e o estilo desejado. Em breve, você poderá
            enviar uma foto do produto para gerar imagens ainda mais fiéis.
          </p>
        </div>

        {/* Main grid */}
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">

          {/* Left: prompt card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl shadow-black/30">
            <label
              htmlFor="prompt"
              className="mb-3 block text-sm font-semibold text-zinc-100"
            >
              Descreva o produto
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              autoComplete="off"
              placeholder="Ex: Tênis esportivo branco, fundo branco limpo, estúdio profissional"
              rows={7}
              maxLength={1000}
              className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <div className="mt-2 flex items-start justify-between gap-4">
              <p className="text-xs leading-relaxed text-zinc-500">
                Quanto mais detalhada a descrição, melhor o resultado.
              </p>
              <p
                className={cn(
                  "shrink-0 text-xs tabular-nums",
                  prompt.length > 800 ? "text-amber-400" : "text-zinc-500"
                )}
              >
                {prompt.length}/1000
              </p>
            </div>

            {/* Style chips */}
            <div className="mt-5 border-t border-zinc-800 pt-5">
              <p className="mb-3 text-xs font-medium text-zinc-400">
                Escolha detalhes do estilo
              </p>
              <div className="flex flex-wrap gap-2">
                {STYLE_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => appendChip(chip)}
                    className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-400 transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-300"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: price + CTA */}
          <div className="flex flex-col gap-5">
            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Price card */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl shadow-black/30">
              <p className="mb-5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Resumo do pedido
              </p>

              <div className="mb-6 flex items-start justify-between">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold text-white">R$ 9,90</span>
                    <span className="text-sm text-zinc-400">por imagem</span>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Pagamento único, sem assinatura.
                  </p>
                </div>
                <span className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-400">
                  PIX
                </span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={!canSubmit}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition-all",
                  canSubmit
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600 active:scale-[0.98]"
                    : "cursor-not-allowed bg-zinc-800 text-zinc-500"
                )}
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
                  "Continuar para pagamento"
                )}
              </button>

              {!canSubmit && !isLoading && (
                <p className="mt-2 text-center text-xs text-zinc-500">
                  Descreva seu produto para liberar o pagamento.
                </p>
              )}
            </div>

            {/* Trust signals */}
            <div className="space-y-3 px-1">
              <p className="flex items-center gap-2 text-xs text-zinc-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                >
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Sua descrição é usada apenas para gerar o resultado.
              </p>
              <p className="flex items-center gap-2 text-xs text-zinc-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                >
                  <path d="M12 2 2 7l10 5 10-5-10-5Z" />
                  <path d="m2 17 10 5 10-5" />
                  <path d="m2 12 10 5 10-5" />
                </svg>
                Ideal para Shopee, Mercado Livre, TikTok Shop e Instagram.
              </p>
            </div>
          </div>
        </div>
    </div>
  );
}
