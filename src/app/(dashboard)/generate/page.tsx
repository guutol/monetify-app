"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";

export default function GeneratePage() {
  const { data: session, update } = useSession();
  const [prompt, setPrompt] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const credits = session?.user?.credits ?? 0;

  async function handleGenerate() {
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setImageBase64(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erro ao gerar imagem");
        return;
      }

      setImageBase64(data.base64);
      // Atualiza créditos na sessão
      await update({ credits: credits - 1 });
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleDownload() {
    if (!imageBase64) return;
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${imageBase64}`;
    link.download = `monetify-${Date.now()}.png`;
    link.click();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Gerar Imagem</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Créditos disponíveis:{" "}
          <span className="font-semibold text-zinc-800">{credits}</span>
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
          onClick={handleGenerate}
          disabled={isLoading || credits <= 0 || prompt.trim().length < 5}
          size="lg"
          className="w-full"
        >
          {isLoading ? "Gerando..." : credits <= 0 ? "Sem créditos" : "Gerar Imagem"}
        </Button>
      </div>

      {isLoading && (
        <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
          <p className="mt-4 text-sm text-zinc-500">Gerando sua imagem...</p>
        </div>
      )}

      {imageBase64 && !isLoading && (
        <div className="mt-8 space-y-4">
          <div className="overflow-hidden rounded-xl border border-zinc-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${imageBase64}`}
              alt={prompt}
              className="w-full"
            />
          </div>
          <Button variant="outline" onClick={handleDownload} className="w-full">
            Baixar Imagem
          </Button>
        </div>
      )}
    </div>
  );
}
