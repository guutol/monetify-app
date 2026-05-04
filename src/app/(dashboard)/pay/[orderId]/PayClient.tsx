"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";

interface Props {
  orderId: string;
  amount: number;
  pixBrCode: string;
  pixBrCodeBase64: string;
  pixExpiresAt: string | null;
  initialPaymentStatus: string;
  initialGenerationStatus: string;
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
  pixBrCode,
  pixBrCodeBase64,
  pixExpiresAt,
  initialPaymentStatus,
  initialGenerationStatus,
  isDevEnvironment,
}: Props) {
  const [phase, setPhase] = useState<Phase>(() => {
    if (initialPaymentStatus === "EXPIRED" || initialPaymentStatus === "CANCELLED") return "expired";
    if (initialPaymentStatus === "PAID") {
      if (initialGenerationStatus === "COMPLETED") return "done";
      if (initialGenerationStatus === "FAILED") return "failed";
      return "paid_ready";
    }
    // Check if the QR code is already expired on mount
    if (pixExpiresAt && new Date(pixExpiresAt).getTime() <= Date.now()) return "expired";
    return "waiting_payment";
  });

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageId, setImageId] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (phase !== "waiting_payment") return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/status/${orderId}`);
        if (!res.ok) return;

        const data = await res.json();

        if (data.paymentStatus === "PAID") {
          stopPolling();
          if (data.generationStatus === "COMPLETED") {
            setPhase("done");
          } else {
            setPhase("paid_ready");
          }
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

  // Schedule expiry when QR code has a future expiry time
  useEffect(() => {
    if (!pixExpiresAt || phase !== "waiting_payment") return;

    const delay = new Date(pixExpiresAt).getTime() - Date.now();
    if (delay <= 0) return; // already handled in initial state

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

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(pixBrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }

  if (phase === "expired") {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="rounded-xl border border-zinc-200 bg-white p-8">
          <p className="text-4xl">⏱</p>
          <h2 className="mt-4 text-lg font-semibold text-zinc-900">Cobrança expirada</h2>
          <p className="mt-2 text-sm text-zinc-500">
            O código PIX expirou. Crie uma nova cobrança para continuar.
          </p>
          <a href="/generate" className="mt-6 block">
            <Button className="w-full">Tentar novamente</Button>
          </a>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Pagamento confirmado e imagem gerada com sucesso!
        </div>

        {imageUrl && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-zinc-200">
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
              download={`monetify-${imageId}.png`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="w-full">
                Baixar Imagem
              </Button>
            </a>
          </div>
        )}

        {!imageUrl && (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
            <p className="text-sm text-zinc-500">
              Imagem gerada. Acesse seu{" "}
              <a href="/history" className="underline">
                histórico
              </a>{" "}
              para baixá-la.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (phase === "failed") {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="rounded-xl border border-red-200 bg-white p-8">
          <p className="text-4xl">❌</p>
          <h2 className="mt-4 text-lg font-semibold text-zinc-900">Falha na geração</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Houve um problema ao gerar sua imagem. Entre em contato com o suporte.
          </p>
        </div>
      </div>
    );
  }

  if (phase === "paid_ready") {
    return (
      <div className="mx-auto max-w-md">
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Pagamento confirmado! Clique no botão abaixo para gerar sua imagem.
        </div>

        {generateError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {generateError}
          </div>
        )}

        <Button onClick={handleGenerate} size="lg" className="w-full">
          Gerar Imagem
        </Button>
      </div>
    );
  }

  if (phase === "generating") {
    return (
      <div className="mx-auto max-w-md">
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
          <p className="mt-4 text-sm text-zinc-500">Gerando sua imagem com IA...</p>
          <p className="mt-1 text-xs text-zinc-400">Isso pode levar até 30 segundos</p>
        </div>
      </div>
    );
  }

  // phase === "waiting_payment"
  return (
    <div className="mx-auto max-w-md">
      {isDevEnvironment && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <span className="font-semibold">devMode</span> — cobrança de teste AbacatePay. Nenhum PIX real será debitado.
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-900">Pague com PIX</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Valor: <span className="font-semibold text-zinc-800">{formatAmount(amount)}</span>
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center">
        {pixBrCodeBase64 ? (
          <Image
            src={pixBrCodeBase64}
            alt="QR Code PIX"
            width={256}
            height={256}
            className="mx-auto"
            unoptimized
          />
        ) : (
          <div className="flex h-64 w-64 mx-auto items-center justify-center rounded-lg bg-zinc-100">
            <p className="text-xs text-zinc-400">QR Code indisponível</p>
          </div>
        )}

        <p className="mt-4 text-xs text-zinc-500">
          Escaneie o QR Code no seu banco ou use o código Pix copia e cola
        </p>

        <button
          onClick={handleCopy}
          className="mt-3 w-full truncate rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-left text-xs font-mono text-zinc-600 hover:bg-zinc-100 transition-colors"
        >
          {copied ? "Copiado!" : pixBrCode || "Código indisponível"}
        </button>

        {pixBrCode && (
          <Button variant="outline" onClick={handleCopy} className="mt-3 w-full text-sm">
            {copied ? "Copiado!" : "Copiar código PIX"}
          </Button>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-zinc-400">
        <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
        Aguardando confirmação do pagamento...
      </div>

      {pixExpiresAt && (
        <p className="mt-2 text-xs text-zinc-400">
          Expira em:{" "}
          {new Date(pixExpiresAt).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}
