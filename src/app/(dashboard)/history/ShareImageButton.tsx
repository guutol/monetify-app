"use client";

import { useState } from "react";

export function ShareImageButton({ imageId }: { imageId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadUrl = `/api/images/${imageId}/download`;

  async function handleShare() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error("fetch_failed");
      const blob = await res.blob();
      const file = new File([blob], "monetify-imagem.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Imagem Monetify",
          text: "Imagem gerada no Monetify",
        });
      } else {
        window.location.href = downloadUrl;
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError("Não foi possível compartilhar. Use o botão de download.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleShare}
        disabled={loading}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-60"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        {loading ? "Preparando..." : "Salvar / Compartilhar"}
      </button>
      {error && <p className="text-center text-xs text-red-400">{error}</p>}
    </div>
  );
}
