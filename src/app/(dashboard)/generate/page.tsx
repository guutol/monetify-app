"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function GeneratePage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    if (!prompt.trim() || isLoading) return;

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

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Gerar Imagem</h1>
        <p className="mt-1 text-sm text-zinc-500">
          R$ 9,90 por imagem gerada — pagamento via PIX
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">
            Descreva o produto
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex: Tênis esportivo branco com detalhes azuis, fundo branco limpo, iluminação profissional de estúdio"
            rows={4}
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 resize-none"
          />
          <p className="mt-1 text-xs text-zinc-400">{prompt.length}/1000 caracteres</p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button
          onClick={handleCheckout}
          disabled={isLoading || prompt.trim().length < 5}
          size="lg"
          className="w-full"
        >
          {isLoading ? "Criando cobrança..." : "Pagar R$ 9,90 e Gerar"}
        </Button>
      </div>
    </div>
  );
}
