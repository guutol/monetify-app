"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { buildSupportWhatsAppUrl, SUPPORT_EMAIL } from "@/config/support";

interface Preview {
  imageId: string;
  imageUrl: string;
}

interface Props {
  orderId: string;
  amount: number;
  orderType: string;
  planLabel: string;
  productsCount: number;
  packageActivated: boolean;
  generationTitle: string;
  generationDescription: string;
  pixBrCode: string;
  pixBrCodeBase64: string;
  pixExpiresAt: string | null;
  initialPaymentStatus: string;
  initialGenerationStatus: string;
  initialImageUrl: string | null;
  initialImageId: string | null;
  initialPreviews: Preview[];
  isTrial: boolean;
  initialWatermarkedPreviews: Preview[];
  isDevEnvironment: boolean;
  userEmail?: string | null;
}

type Phase =
  | "trial_previews"
  | "waiting_payment"
  | "paid_ready"
  | "generating"
  | "choosing"
  | "done"
  | "expired"
  | "failed";

function formatAmount(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function InvoiceRequestLink({ orderId }: { orderId: string }) {
  const whatsapp = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;

  if (!whatsapp) {
    return (
      <p className="pt-4 text-center text-xs text-zinc-600">
        Precisa de nota fiscal? Entre em contato pelo suporte informando o número do pedido, CPF/CNPJ, nome/razão social e e-mail.
      </p>
    );
  }

  const message = encodeURIComponent(
    `Olá! Quero solicitar nota fiscal do pedido #${orderId}.\nCPF/CNPJ: \nNome completo/Razão social: \nE-mail para envio da nota: `
  );

  return (
    <div className="border-t border-zinc-800 pt-4 text-center">
      <p className="text-xs text-zinc-500">Precisa de nota fiscal?</p>
      <a
        href={`https://wa.me/${whatsapp}?text=${message}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-block text-xs text-zinc-400 underline-offset-2 hover:text-zinc-300 hover:underline"
      >
        Solicitar nota fiscal
      </a>
    </div>
  );
}

function SupportRefundBlock({
  orderId,
  imageId,
  userEmail,
}: {
  orderId: string;
  imageId?: string | null;
  userEmail?: string | null;
}) {
  const whatsappUrl = buildSupportWhatsAppUrl({ orderId, imageId, userEmail });
  if (!whatsappUrl && !SUPPORT_EMAIL) return null;

  return (
    <div className="mt-4 border-t border-zinc-800 pt-4">
      <p className="text-xs font-medium text-zinc-400">Precisa de ajuda com este pedido?</p>
      <p className="mt-0.5 text-xs text-zinc-600">
        Se teve problema com pagamento, geração ou download, fale com o suporte.
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-500 underline-offset-2 transition-colors hover:text-zinc-300 hover:underline"
          >
            Falar com suporte
          </a>
        )}
        {SUPPORT_EMAIL && (
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=Suporte pedido ${orderId}`}
            className="text-xs text-zinc-500 underline-offset-2 transition-colors hover:text-zinc-300 hover:underline"
          >
            Enviar e-mail
          </a>
        )}
      </div>
    </div>
  );
}

// ── Trial previews UI ─────────────────────────────────────────────────────────

function TrialPayUI({
  orderId,
  watermarkedPreviews,
  isDevEnvironment,
  userEmail,
  onUnlocked,
}: {
  orderId: string;
  watermarkedPreviews: Preview[];
  isDevEnvironment: boolean;
  userEmail?: string | null;
  onUnlocked: (pixBrCode: string, pixBrCodeBase64: string, pixExpiresAt: string | null) => void;
}) {
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  async function handleUnlock() {
    setUnlocking(true);
    setUnlockError(null);
    try {
      const res = await fetch("/api/payments/checkout/trial-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUnlockError(data.error ?? "Erro ao criar cobrança. Tente novamente.");
        return;
      }
      onUnlocked(data.brCode ?? "", data.brCodeBase64 ?? "", data.expiresAt ?? null);
    } catch {
      setUnlockError("Erro de conexão. Tente novamente.");
    } finally {
      setUnlocking(false);
    }
  }

  async function handleSimulateUnlock() {
    setSimulating(true);
    setUnlockError(null);
    try {
      // First create the PIX charge, then simulate payment
      const unlockRes = await fetch("/api/payments/checkout/trial-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      if (!unlockRes.ok) {
        const d = await unlockRes.json();
        setUnlockError(d.error ?? "Erro ao criar cobrança");
        return;
      }
      const data = await unlockRes.json();
      // Simulate paid webhook
      const simRes = await fetch(`/api/dev/orders/${orderId}/simulate-paid-webhook`, { method: "POST" });
      if (!simRes.ok) {
        // Still show PIX if simulation fails
        onUnlocked(data.brCode ?? "", data.brCodeBase64 ?? "", data.expiresAt ?? null);
        return;
      }
      // Payment simulated: go directly to choosing phase
      onUnlocked("__PAID__", "", null);
    } catch {
      setUnlockError("Erro de conexão.");
    } finally {
      setSimulating(false);
    }
  }

  return (
    <div className="-m-8 min-h-screen overflow-x-hidden bg-zinc-950 px-6 py-10 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <a
          href="/generate"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Voltar para geração
        </a>

        <div className="mb-8 mt-6">
          <p className="text-sm font-semibold text-emerald-400">Monetify</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
            Sua prévia está pronta!
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Gostou do resultado? Pague R$ 9,90 para liberar a imagem final sem marca d&apos;água.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
          {/* Watermarked previews */}
          <div className="space-y-4">
            <div className={watermarkedPreviews.length > 1 ? "grid grid-cols-1 gap-4 sm:grid-cols-2" : "mx-auto max-w-sm"}>
              {watermarkedPreviews.map((preview, idx) => (
                <div key={preview.imageId} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                  <div className="relative">
                    <Image
                      src={preview.imageUrl}
                      alt={`Prévia ${idx + 1}`}
                      width={512}
                      height={512}
                      className="w-full"
                      unoptimized
                    />
                  </div>
                  <div className="px-4 py-2.5">
                    <p className="text-xs text-zinc-500">
                      {watermarkedPreviews.length > 1
                        ? `Prévia ${idx + 1} de ${watermarkedPreviews.length} — com marca d'água`
                        : "Sua prévia — com marca d'água"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-zinc-600">
              A imagem final liberada não terá marca d&apos;água.
            </p>
          </div>

          {/* Payment panel */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl shadow-black/30">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Liberar imagem</p>

              <div className="mb-5">
                <span className="text-3xl font-bold text-white">R$ 9,90</span>
                <p className="mt-1 text-xs text-zinc-400">Pagamento único via PIX · sem assinatura</p>
              </div>

              <div className="mb-5 space-y-2.5">
                {[
                  "Imagem sem marca d'água",
                  "Download imediato após o pagamento",
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-emerald-400">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <p className="text-xs text-zinc-400">{text}</p>
                  </div>
                ))}
              </div>

              {unlockError && (
                <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {unlockError}
                </div>
              )}

              <button
                onClick={handleUnlock}
                disabled={unlocking || simulating}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {unlocking ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Criando cobrança...
                  </>
                ) : (
                  "Desbloquear sem marca por R$ 9,90"
                )}
              </button>

              {isDevEnvironment && (
                <div className="mt-4 border-t border-dashed border-amber-500/20 pt-4">
                  <button
                    onClick={handleSimulateUnlock}
                    disabled={unlocking || simulating}
                    className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/15 disabled:opacity-50"
                  >
                    {simulating ? "Simulando..." : "Simular desbloqueio (dev)"}
                  </button>
                  <p className="mt-1 text-center text-xs text-zinc-600">Apenas em desenvolvimento</p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Próximos passos</p>
              <div className="space-y-3">
                {["Você paga R$ 9,90 via PIX", "Baixa a imagem sem marca d'água"].map((text, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-xs font-bold text-emerald-400">
                      {i + 1}
                    </div>
                    <p className="text-xs text-zinc-400">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <SupportRefundBlock orderId={orderId} userEmail={userEmail} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Package order UI (completely separate from the generation flow) ───────────

function PackagePayUI({
  orderId,
  amount,
  planLabel,
  productsCount,
  packageActivated: initialPackageActivated,
  pixBrCode,
  pixBrCodeBase64,
  pixExpiresAt,
  initialPaymentStatus,
  isDevEnvironment,
  userEmail,
}: {
  orderId: string;
  amount: number;
  planLabel: string;
  productsCount: number;
  packageActivated: boolean;
  pixBrCode: string;
  pixBrCodeBase64: string;
  pixExpiresAt: string | null;
  initialPaymentStatus: string;
  isDevEnvironment: boolean;
  userEmail?: string | null;
}) {
  const router = useRouter();
  const [isPaid, setIsPaid] = useState(initialPaymentStatus === "PAID");
  const [packageActivated, setPackageActivated] = useState(initialPackageActivated);
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulateError, setSimulateError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update local state when server re-renders with fresh packageActivated prop
  useEffect(() => {
    if (initialPackageActivated && !packageActivated) {
      setPackageActivated(true);
    }
  }, [initialPackageActivated, packageActivated]);

  // Poll payment status every 3s while pending
  useEffect(() => {
    if (isPaid) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/status/${orderId}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.paymentStatus === "PAID") {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setIsPaid(true);
          // Refresh server component to get fresh packageActivated value
          router.refresh();
        }
      } catch {
        // ignore transient errors
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isPaid, orderId, router]);

  // Poll for activation after payment (in case webhook takes a moment)
  useEffect(() => {
    if (!isPaid || packageActivated) return;

    const interval = setInterval(() => {
      router.refresh();
    }, 4000);

    return () => clearInterval(interval);
  }, [isPaid, packageActivated, router]);

  // Local expiry timer
  useEffect(() => {
    if (!pixExpiresAt || isPaid) return;
    const delay = new Date(pixExpiresAt).getTime() - Date.now();
    if (delay <= 0) return;
    const t = setTimeout(() => setIsPaid(false), delay); // keep showing expired state
    return () => clearTimeout(t);
  }, [pixExpiresAt, isPaid]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(pixBrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }

  async function handleSimulatePaid() {
    setSimulating(true);
    setSimulateError(null);
    try {
      const res = await fetch(`/api/dev/orders/${orderId}/simulate-paid-webhook`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setSimulateError(data.error ?? "Erro ao simular pagamento");
        return;
      }
      setIsPaid(true);
      router.refresh();
    } catch {
      setSimulateError("Erro de conexão.");
    } finally {
      setSimulating(false);
    }
  }

  // ── PACKAGE PENDING ────────────────────────────────────────────────────────
  if (!isPaid) {
    return (
      <div className="-m-8 min-h-screen overflow-x-hidden bg-zinc-950 px-6 py-10 lg:px-10">
        <div className="mx-auto max-w-5xl">
          <a
            href="/plans"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Voltar para pacotes
          </a>

          <div className="mb-8 mt-6">
            <p className="text-sm font-semibold text-emerald-400">Monetify</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
              Finalize seu pagamento
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Após a confirmação, seus produtos disponíveis são ativados automaticamente.
            </p>
          </div>

          {isDevEnvironment && (
            <div className="mb-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-4">
              <p className="text-xs font-semibold text-amber-400">Ambiente de teste</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-300/70">
                Este pagamento está usando o modo de desenvolvimento. Nenhum PIX real será debitado.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px]">
            <div className="order-2 min-w-0 space-y-5 lg:order-1">

              {/* Package order card */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Seu pacote</p>
                <p className="text-sm font-semibold text-zinc-200">{planLabel || "Pacote de produtos"}</p>
                {productsCount > 0 && (
                  <p className="mt-1 text-xs text-zinc-500">
                    +{productsCount} {productsCount === 1 ? "produto disponível" : "produtos disponíveis"} após o pagamento
                  </p>
                )}
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-white">{formatAmount(amount)}</span>
                  <span className="text-sm text-zinc-500">pagamento único</span>
                </div>
              </div>

              {/* Steps */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">O que acontece depois</p>
                <div className="space-y-4">
                  {[
                    "Você finaliza o pagamento",
                    `Seus ${productsCount > 0 ? productsCount : ""} produtos disponíveis são ativados`,
                    "Você gera imagens quando quiser, sem pagar de novo",
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

            {/* PIX panel */}
            <div className="order-1 min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl shadow-black/30 lg:order-2">
              <p className="mb-5 text-xs font-semibold uppercase tracking-wider text-zinc-500">Resumo do pagamento</p>

              <div className="mb-5 flex items-start justify-between">
                <div>
                  <span className="text-3xl font-bold text-white">{formatAmount(amount)}</span>
                  <p className="mt-0.5 text-xs text-zinc-500">Pagamento único, sem assinatura.</p>
                </div>
                <span className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-400">PIX</span>
              </div>

              <div className="mb-4 flex justify-center">
                {pixBrCodeBase64 ? (
                  <div className="overflow-hidden rounded-xl border border-zinc-700 bg-white p-2">
                    <Image src={pixBrCodeBase64} alt="QR Code PIX" width={216} height={216} unoptimized />
                  </div>
                ) : (
                  <div className="flex h-56 w-56 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800">
                    <p className="text-xs text-zinc-500">QR Code indisponível</p>
                  </div>
                )}
              </div>

              <p className="mb-3 text-center text-xs text-zinc-400">Escaneie no seu banco ou use o código abaixo</p>

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

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-400">
                <div className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                Aguardando confirmação do pagamento...
              </div>

              {pixExpiresAt && (
                <p className="mt-2 text-center text-xs text-zinc-500">
                  Expira às{" "}
                  {new Date(pixExpiresAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}

              {isDevEnvironment && (
                <div className="mt-5 border-t border-dashed border-amber-500/20 pt-5">
                  {simulateError && <p className="mb-2 text-xs text-red-400">{simulateError}</p>}
                  <button
                    onClick={handleSimulatePaid}
                    disabled={simulating}
                    className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/15 disabled:opacity-50"
                  >
                    {simulating ? "Simulando..." : "Simular pagamento aprovado"}
                  </button>
                  <p className="mt-1 text-center text-xs text-zinc-600">Apenas em desenvolvimento</p>
                </div>
              )}
              <SupportRefundBlock orderId={orderId} userEmail={userEmail} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── PACKAGE PAID ──────────────────────────────────────────────────────────
  return (
    <div className="-m-8 min-h-screen overflow-x-hidden bg-zinc-950 px-6 py-10 lg:px-10">
      <div className="mx-auto max-w-md">
        <a
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Ir para o dashboard
        </a>

        <div className="mt-8">
          {packageActivated ? (
            /* ── Activated ───────────────────────────────────────────────── */
            <>
              <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-8 text-center">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-xl font-bold text-white">Pacote ativado!</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Seus produtos disponíveis já foram adicionados à sua conta.
                </p>
                {productsCount > 0 && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2">
                    <span className="text-lg font-bold text-emerald-400">+{productsCount}</span>
                    <span className="text-sm text-emerald-300">
                      {productsCount === 1 ? "produto disponível" : "produtos disponíveis"}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <a
                  href="/generate"
                  className="flex w-full items-center justify-center rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition-colors hover:bg-emerald-600"
                >
                  Gerar imagem agora
                </a>
                <a
                  href="/plans"
                  className="flex w-full items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 px-6 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                >
                  Ver pacotes
                </a>
              </div>
              <InvoiceRequestLink orderId={orderId} />
              <SupportRefundBlock orderId={orderId} userEmail={userEmail} />
            </>
          ) : (
            /* ── Pending activation (dev simulation or webhook delay) ────── */
            <>
              <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-white">Pagamento confirmado</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Estamos ativando seus produtos disponíveis. Isso pode levar alguns instantes.
                </p>

                {isDevEnvironment && (
                  <p className="mt-4 text-xs leading-relaxed text-zinc-600">
                    Este pagamento foi marcado manualmente em desenvolvimento. Os produtos disponíveis
                    só são adicionados quando o webhook for processado.
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <a
                  href="/dashboard"
                  className="flex w-full items-center justify-center rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition-colors hover:bg-emerald-600"
                >
                  Ir para o dashboard
                </a>
                <a
                  href="/plans"
                  className="flex w-full items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 px-6 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                >
                  Ver pacotes
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Generation order UI (unchanged) ──────────────────────────────────────────

export function PayClient({
  orderId,
  amount,
  orderType,
  planLabel,
  productsCount,
  packageActivated,
  generationTitle,
  generationDescription,
  pixBrCode: pixBrCodeProp,
  pixBrCodeBase64: pixBrCodeBase64Prop,
  pixExpiresAt: pixExpiresAtProp,
  initialPaymentStatus,
  initialGenerationStatus,
  initialImageUrl,
  initialImageId,
  initialPreviews,
  isTrial,
  initialWatermarkedPreviews,
  isDevEnvironment,
  userEmail,
}: Props) {
  // Delegate PACKAGE orders to the dedicated UI
  if (orderType === "PACKAGE") {
    return (
      <PackagePayUI
        orderId={orderId}
        amount={amount}
        planLabel={planLabel}
        productsCount={productsCount}
        packageActivated={packageActivated}
        pixBrCode={pixBrCodeProp}
        pixBrCodeBase64={pixBrCodeBase64Prop}
        pixExpiresAt={pixExpiresAtProp}
        initialPaymentStatus={initialPaymentStatus}
        isDevEnvironment={isDevEnvironment}
        userEmail={userEmail}
      />
    );
  }

  const [phase, setPhase] = useState<Phase>(() => {
    if (
      initialPaymentStatus === "EXPIRED" ||
      initialPaymentStatus === "CANCELLED"
    )
      return "expired";
    if (initialPaymentStatus === "PAID") {
      if (initialGenerationStatus === "COMPLETED") {
        if (initialImageUrl) return "done";
        if (initialPreviews.length > 0) return "choosing";
        return "done";
      }
      if (initialGenerationStatus === "FAILED") return "failed";
      return "paid_ready";
    }
    // Trial orders with completed generation show watermarked previews before payment
    if (isTrial && initialGenerationStatus === "COMPLETED" && initialPaymentStatus === "PENDING") {
      return "trial_previews";
    }
    if (pixExpiresAtProp && new Date(pixExpiresAtProp).getTime() <= Date.now())
      return "expired";
    return "waiting_payment";
  });

  // Mutable PIX state — starts from props, updated when trial-unlock creates the charge
  const [pixBrCode, setPixBrCode] = useState(pixBrCodeProp);
  const [pixBrCodeBase64, setPixBrCodeBase64] = useState(pixBrCodeBase64Prop);
  const [pixExpiresAt, setPixExpiresAt] = useState(pixExpiresAtProp);

  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [imageId, setImageId] = useState<string | null>(initialImageId);
  const [previews, setPreviews] = useState<Preview[]>(initialPreviews);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [chooseError, setChooseError] = useState<string | null>(null);
  const [isChoosing, setIsChoosing] = useState(false);
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

  function handleTrialUnlocked(brCode: string, brCodeBase64: string, expiresAt: string | null) {
    if (brCode === "__PAID__") {
      setPhase("choosing");
      return;
    }
    setPixBrCode(brCode);
    setPixBrCodeBase64(brCodeBase64);
    setPixExpiresAt(expiresAt);
    setPhase("waiting_payment");
  }

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
          if (data.generationStatus === "COMPLETED") {
            // Trial: previews already generated, go straight to choosing
            // Standard old flow: generation was triggered externally, show done
            setPhase(isTrial ? "choosing" : "done");
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
  }, [phase, orderId, stopPolling, isTrial]);

  // Auto-choose the single image for trial orders — no need to show a selection screen
  useEffect(() => {
    if (phase !== "choosing" || !isTrial || previews.length !== 1 || isChoosing) return;
    handleChoose(previews[0].imageId, previews[0].imageUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isTrial, previews.length]);

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
        setGenerateError(data.error ?? "Erro ao gerar imagens");
        setPhase("paid_ready");
        return;
      }

      setPreviews(data.previews ?? []);
      setPhase("choosing");
    } catch {
      setGenerateError("Erro de conexão. Tente novamente.");
      setPhase("paid_ready");
    }
  }

  async function handleChoose(chosenImageId: string, chosenImageUrl: string) {
    setIsChoosing(true);
    setChooseError(null);

    try {
      const res = await fetch(`/api/orders/${orderId}/choose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: chosenImageId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setChooseError(data.error ?? "Erro ao escolher imagem. Tente novamente.");
        return;
      }

      setImageUrl(chosenImageUrl);
      setImageId(chosenImageId);
      setPhase("done");
    } catch {
      setChooseError("Erro de conexão. Tente novamente.");
    } finally {
      setIsChoosing(false);
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

  // ── Trial previews phase: delegate to full-page TrialPayUI ────────────────
  if (phase === "trial_previews") {
    return (
      <TrialPayUI
        orderId={orderId}
        watermarkedPreviews={initialWatermarkedPreviews.length > 0 ? initialWatermarkedPreviews : previews}
        isDevEnvironment={isDevEnvironment}
        userEmail={userEmail}
        onUnlocked={handleTrialUnlocked}
      />
    );
  }

  const PHASE_TITLE: Record<Phase, string> = {
    trial_previews: "",
    waiting_payment: "Finalize seu pagamento",
    paid_ready: "Pagamento confirmado!",
    generating: "Gerando suas prévias...",
    choosing: "Escolha sua imagem final",
    done: "Imagem gerada com sucesso!",
    expired: "Cobrança expirada",
    failed: "Falha na geração",
  };

  const PHASE_SUBTITLE: Record<Phase, string> = {
    trial_previews: "",
    waiting_payment:
      "Após a confirmação do pagamento, sua imagem será gerada automaticamente.",
    paid_ready: "Clique abaixo para gerar suas 2 prévias com IA.",
    generating: "Isso pode levar até 60 segundos. Não feche esta página.",
    choosing:
      "Selecione 1 das 2 prévias geradas. Apenas a imagem escolhida ficará disponível para download.",
    done: "Seu resultado está pronto para download.",
    expired: "O código PIX expirou. Crie uma nova cobrança para continuar.",
    failed: "Houve um problema ao gerar sua imagem.",
  };

  return (
    <div className="-m-8 min-h-screen overflow-x-hidden bg-zinc-950 px-6 py-10 lg:px-10">
      <div className="mx-auto max-w-5xl">

        {/* Back link */}
        <a
          href={phase === "done" ? "/history" : "/generate"}
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
          {phase === "done" ? "Voltar para histórico" : "Voltar para geração"}
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
          <>
            {isDevEnvironment && (
              <div className="mb-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-4">
                <p className="text-xs font-semibold text-amber-400">
                  Ambiente de teste
                </p>
                <p className="mt-1 text-xs leading-relaxed text-amber-300/70">
                  Este pagamento está usando o modo de desenvolvimento. Nenhum
                  PIX real será debitado.
                </p>
              </div>
            )}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px]">

            <div className="order-2 min-w-0 space-y-5 lg:order-1">

              {/* Order card */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Seu pedido
                </p>
                <p className="text-sm font-semibold text-zinc-200">{generationTitle}</p>
                {generationDescription && (
                  <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{generationDescription}</p>
                )}
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-white">
                    {formatAmount(amount)}
                  </span>
                  <span className="text-sm text-zinc-500">
                    2 prévias geradas por IA
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
                    "A IA gera 2 prévias da sua imagem",
                    "Você escolhe 1 prévia como resultado final",
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

            <div className="order-1 min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl shadow-black/30 lg:order-2">
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
              <SupportRefundBlock orderId={orderId} userEmail={userEmail} />
            </div>
          </div>
          </>
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
                Clique abaixo para gerar suas 2 prévias com IA.
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
              Gerar 2 prévias
            </button>
          </div>
        )}

        {/* ── generating ──────────────────────────────────── */}
        {phase === "generating" && (
          <div className="mx-auto max-w-md">
            <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500" />
              <p className="mt-5 text-sm font-medium text-zinc-300">
                Gerando 2 prévias com IA...
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                Isso pode levar até 60 segundos
              </p>
            </div>
          </div>
        )}

        {/* ── choosing ────────────────────────────────────── */}
        {phase === "choosing" && (
          <div className="space-y-5">
            {chooseError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {chooseError}
              </div>
            )}

            {isTrial && previews.length <= 1 ? (
              <div className="mx-auto max-w-md">
                <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 py-20">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500" />
                  <p className="mt-5 text-sm font-medium text-zinc-300">
                    Liberando sua imagem...
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {previews.map((preview, idx) => (
                    <div
                      key={preview.imageId}
                      className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900"
                    >
                      {/* Image with watermark overlay */}
                      <div className="relative">
                        <Image
                          src={preview.imageUrl}
                          alt={`Prévia ${idx + 1}`}
                          width={512}
                          height={512}
                          className="w-full"
                          unoptimized
                        />
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <span className="select-none rotate-[-30deg] text-3xl font-bold tracking-widest text-white/20">
                            PRÉVIA
                          </span>
                        </div>
                      </div>

                      {/* Card body */}
                      <div className="p-4">
                        <p className="mb-3 text-xs text-zinc-500">
                          Opção {idx + 1} de {previews.length}
                        </p>
                        <button
                          onClick={() => handleChoose(preview.imageId, preview.imageUrl)}
                          disabled={isChoosing}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isChoosing ? (
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
                              Salvando...
                            </>
                          ) : (
                            "Escolher esta imagem"
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-center text-xs text-zinc-600">
                  Após escolher, apenas a imagem selecionada ficará disponível para download.
                </p>
              </>
            )}
          </div>
        )}

        {/* ── done ────────────────────────────────────────── */}
        {phase === "done" && (
          <div className="mx-auto max-w-2xl space-y-5">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4">
              <p className="text-sm font-semibold text-emerald-400">
                Imagem escolhida e pronta para download!
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
                  href={imageId ? `/api/images/${imageId}/download` : imageUrl}
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
            <InvoiceRequestLink orderId={orderId} />
            <SupportRefundBlock orderId={orderId} imageId={imageId} userEmail={userEmail} />
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
              <SupportRefundBlock orderId={orderId} imageId={imageId} userEmail={userEmail} />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
