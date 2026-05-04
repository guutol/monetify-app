"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import Image from "next/image";

export default function GeneratePage() {
  const { data: session, update } = useSession();
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState("monetify.png");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const credits = session?.user?.credits ?? 0;

  async function handleGenerate() {
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setImageUrl(null);

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

      setImageUrl(data.imageUrl);
      setDownloadName(`monetify-${data.imageId}.png`);
      await update({ credits: credits - 1 });
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

      {imageUrl && !isLoading && (
        <div className="mt-8 space-y-4">
          <div className="overflow-hidden rounded-xl border border-zinc-200">
            <Image
              src={imageUrl}
              alt={prompt}
              width={1024}
              height={1024}
              className="w-full"
              unoptimized
            />
          </div>
          <a
            href={imageUrl}
            download={downloadName}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="w-full">
              Baixar Imagem
            </Button>
          </a>
        </div>
      )}
    </div>
  );
}
