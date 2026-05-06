"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

interface Props {
  orderId: string;
  amount: number;
  prompt: string;
  pixBrCode: string;
  pixBrCodeBase64: string;
  pixExpiresAt: string | null;
  initialPaymentStatus: string;
  initialGenerationStatus: string;
  initialImageUrl: string | null;
  initialImageId: string | null;
  isDevEnvironment: boolean;
}

type Phase =
  | "waiting_payment"
  | "paid_ready"
  | "generating"
  | "done"
  | "expired"
  | "failed";

function formatAmount(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function PayClient({
  orderId,
  amount,
  prompt,
  pixBrCode,
  pixBrCodeBase64,
  pixExpiresAt,
  initialPaymentStatus,
  initialGenerationStatus,
  initialImageUrl,
  initialImageId,
  isDevEnvironment,
}: Props) {
  const [phase, setPhase] = useState<Phase>(() => {
    if (
      initialPaymentStatus === "EXPIRED" ||
      initialPaymentStatus === "CANCELLED"
    )
      return "expired";
    if (initialPaymentStatus === "PAID") {
      if (initialGenerationStatus === "COMPLETED") return "done";
      if (initialGenerationStatus === "FAILED") return "failed";
      return "paid_ready";
    }
    if (pixExpiresAt && new Date(pixExpiresAt).getTime() <= Date.now())
      return "expired";
    return "waiting_payment";
  });

  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [imageId, setImageId] = useState<string | null>(initialImageId);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulateError, setSimulateError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Poll payment status every 3s while waiting
  useEffect(() => {
    if (phase !== "waiting_payment") return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/status/${orderId}`);
        if (!res.ok) return;

        const data = await res.json();

        if (data.paymentStatus === "PAID") {
          stopPolling();
          setPhase(
            data.generationStatus === "COMPLETED" ? "done" : "paid_ready"
          );
        } else if (
          data.paymentStatus === "EXPIRED" ||
          data.paymentStatus === "CANCELLED"
        ) {
          stopPolling();
          setPhase("expired");
        }
      } catch {
        // ignore transient errors
      }
    }, 3000);

    return stopPolling;
  }, [phase, orderId, stopPolling]);

  // Schedule local expiry transition when QR has a future expiry
  useEffect(() => {
    if (!pixExpiresAt || phase !== "waiting_payment") return;

    const delay = new Date(pixExpiresAt).getTime() - Date.now();
    if (delay <= 0) return;

    const t = setTimeout(() => {
      setPhase("expired");
      stopPolling();
    }, delay);

    return () => clearTimeout(t);
  }, [pixExpiresAt, phase, stopPolling]);

  async function handleGenerate() {
    setPhase("generating");
    setGenerateError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGenerateError(data.error ?? "Erro ao gerar imagem");
        setPhase("paid_ready");
        return;
      }

      setImageUrl(data.imageUrl);
      setImageId(data.imageId);
      setPhase("done");
    } catch {
      setGenerateError("Erro de conexão. Tente novamente.");
      setPhase("paid_ready");
    }
  }

  async function handleSimulatePaid() {
    setSimulating(true);
    setSimulateError(null);

    try {
      const res = await fetch(`/api/dev/orders/${orderId}/mark-paid`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setSimulateError(data.error ?? "Erro ao simular pagamento");
        return;
      }

      stopPolling();
      setPhase("paid_ready");
    } catch {
      setSimulateError("Erro de conexão.");
    } finally {
      setSimulating(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(pixBrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }

  const PHASE_TITLE: Record<Phase, string> = {
    waiting_payment: "Finalize seu pagamento",
    paid_ready: "Pagamento confirmado!",
    generating: "Gerando sua imagem...",
    done: "Imagem gerada com sucesso!",
    expired: "Cobrança expirada",
    failed: "Falha na geração",
  };

  const PHASE_SUBTITLE: Record<Phase, string> = {
    waiting_payment:
      "Após a confirmação do pagamento, sua imagem será gerada automaticamente.",
    paid_ready: "Clique abaixo para gerar sua imagem com IA.",
    generating: "Isso pode levar até 30 segundos. Não feche esta página.",
    done: "Seu resultado está pronto para download.",
    expired: "O código PIX expirou. Crie uma nova cobrança para continuar.",
    failed: "Houve um problema ao gerar sua imagem.",
  };

  return (
    <div className="-m-8 min-h-screen overflow-x-hidden bg-zinc-950 px-6 py-10 lg:px-10">
      <div className="mx-auto max-w-5xl">

        {/* Back link */}
        <a
          href="/generate"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Voltar para geração
        </a>

        {/* Page header */}
        <div className="mb-8 mt-6">
          <p className="text-sm font-semibold text-emerald-400">Monetify</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
            {PHASE_TITLE[phase]}
          </h1>
          <p className="mt-2 text-sm text-zinc-400">{PHASE_SUBTITLE[phase]}</p>
        </div>

        {/* ── waiting_payment ─────────────────────────────── */}
        {phase === "waiting_payment" && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px]">

            {/* Left column */}
            <div className="min-w-0 space-y-5">

              {/* Dev alert */}
              {isDevEnvironment && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-4">
                  <p className="text-xs font-semibold text-amber-400">
                    Ambiente de teste
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-amber-300/70">
                    Este pagamento está usando o modo de desenvolvimento. Nenhum
                    PIX real será debitado.
                  </p>
                </div>
              )}

              {/* Order card */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Seu pedido
                </p>
                {prompt && (
                  <p className="line-clamp-3 break-words text-sm leading-relaxed text-zinc-300">
                    &ldquo;{prompt}&rdquo;
                  </p>
                )}
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-white">
                    {formatAmount(amount)}
                  </span>
                  <span className="text-sm text-zinc-500">
                    imagem gerada por IA
                  </span>
                </div>
              </div>

              {/* Next steps */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Próximos passos
                </p>
                <div className="space-y-4">
                  {[
                    "Você finaliza o pagamento",
                    "A IA gera sua imagem",
                    "Você baixa o resultado no histórico",
                  ].map((text, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-xs font-bold text-emerald-400">
                        {i + 1}
                      </div>
                      <p className="text-sm text-zinc-400">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column: payment card */}
            <div className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl shadow-black/30">
              <p className="mb-5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Resumo do pagamento
              </p>

              <div className="mb-5 flex items-start justify-between">
                <div>
                  <span className="text-3xl font-bold text-white">
                    {formatAmount(amount)}
                  </span>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Pagamento único, sem assinatura.
                  </p>
                </div>
                <span className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-400">
                  PIX
                </span>
              </div>

              {/* QR Code */}
              <div className="mb-4 flex justify-center">
                {pixBrCodeBase64 ? (
                  <div className="overflow-hidden rounded-xl border border-zinc-700 bg-white p-2">
                    <Image
                      src={pixBrCodeBase64}
                      alt="QR Code PIX"
                      width={216}
                      height={216}
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="flex h-56 w-56 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800">
                    <p className="text-xs text-zinc-500">QR Code indisponível</p>
                  </div>
                )}
              </div>

              <p className="mb-3 text-center text-xs text-zinc-400">
                Escaneie no seu banco ou use o código abaixo
              </p>

              {/* PIX code display */}
              <button
                onClick={handleCopy}
                className="w-full truncate rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-left text-xs font-mono text-zinc-400 transition-colors hover:bg-zinc-700"
              >
                {copied ? "✓ Copiado!" : pixBrCode || "Código indisponível"}
              </button>

              {pixBrCode && (
                <button
                  onClick={handleCopy}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                >
                  {copied ? "Código copiado!" : "Copiar código PIX"}
                </button>
              )}

              {/* Polling indicator */}
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-400">
                <div className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                Aguardando confirmação do pagamento...
              </div>

              {pixExpiresAt && (
                <p className="mt-2 text-center text-xs text-zinc-500">
                  Expira às{" "}
                  {new Date(pixExpiresAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}

              {/* Dev: simulate paid */}
              {isDevEnvironment && (
                <div className="mt-5 border-t border-dashed border-amber-500/20 pt-5">
                  {simulateError && (
                    <p className="mb-2 text-xs text-red-400">{simulateError}</p>
                  )}
                  <button
                    onClick={handleSimulatePaid}
                    disabled={simulating}
                    className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/15 disabled:opacity-50"
                  >
                    {simulating ? "Simulando..." : "Simular pagamento aprovado"}
                  </button>
                  <p className="mt-1 text-center text-xs text-zinc-600">
                    Apenas em desenvolvimento
                  </p>
                </div>
              )}

              {/* Trust signals */}
              <div className="mt-5 space-y-2.5 border-t border-zinc-800 pt-5">
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
                  Seu pedido ficará disponível no histórico.
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
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Você poderá acompanhar o status da geração.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── paid_ready ───────────────────────────────────── */}
        {phase === "paid_ready" && (
          <div className="mx-auto max-w-md">
            <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center">
              <div className="mb-3 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-emerald-400"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
              </div>
              <p className="text-sm font-semibold text-emerald-400">
                Pagamento confirmado!
              </p>
              <p className="mt-1 text-xs text-emerald-300/70">
                Clique abaixo para gerar sua imagem com IA.
              </p>
            </div>

            {generateError && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {generateError}
              </div>
            )}

            <button
              onClick={handleGenerate}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-4 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-[0.98]"
            >
              Gerar Imagem
            </button>
          </div>
        )}

        {/* ── generating ──────────────────────────────────── */}
        {phase === "generating" && (
          <div className="mx-auto max-w-md">
            <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500" />
              <p className="mt-5 text-sm font-medium text-zinc-300">
                Gerando sua imagem com IA...
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                Isso pode levar até 30 segundos
              </p>
            </div>
          </div>
        )}

        {/* ── done ────────────────────────────────────────── */}
        {phase === "done" && (
          <div className="mx-auto max-w-2xl space-y-5">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4">
              <p className="text-sm font-semibold text-emerald-400">
                Pagamento confirmado e imagem gerada com sucesso!
              </p>
            </div>

            {imageUrl ? (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-2xl border border-zinc-800">
                  <Image
                    src={imageUrl}
                    alt="Imagem gerada"
                    width={1024}
                    height={1024}
                    className="w-full"
                    unoptimized
                  />
                </div>
                <a
                  href={imageUrl}
                  download={`monetify-${imageId ?? orderId}.png`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                >
                  Baixar imagem
                </a>
              </div>
            ) : (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-400">
                Imagem gerada. Acesse seu{" "}
                <a href="/history" className="text-emerald-400 hover:underline">
                  histórico
                </a>{" "}
                para baixá-la.
              </div>
            )}

            <div className="flex gap-3">
              <a
                href="/history"
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-center text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
              >
                Ver histórico
              </a>
              <a
                href="/generate"
                className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
              >
                Gerar outra imagem
              </a>
            </div>
          </div>
        )}

        {/* ── expired ─────────────────────────────────────── */}
        {phase === "expired" && (
          <div className="mx-auto max-w-md text-center">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10">
              <div className="mb-4 flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-zinc-400"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
              </div>
              <h2 className="text-lg font-semibold text-white">
                Cobrança expirada
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                O código PIX expirou. Crie uma nova cobrança para continuar.
              </p>
              <a
                href="/generate"
                className="mt-6 flex w-full items-center justify-center rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
              >
                Tentar novamente
              </a>
            </div>
          </div>
        )}

        {/* ── failed ──────────────────────────────────────── */}
        {phase === "failed" && (
          <div className="mx-auto max-w-md text-center">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10">
              <div className="mb-4 flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-red-400"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </div>
              </div>
              <h2 className="text-lg font-semibold text-white">
                Falha na geração
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Houve um problema ao gerar sua imagem.
              </p>
              {generateError && (
                <p className="mt-2 text-xs text-red-400">{generateError}</p>
              )}
              <button
                onClick={handleGenerate}
                className="mt-6 w-full rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
