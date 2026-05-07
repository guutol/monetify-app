"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ── Generation types ──────────────────────────────────────────────────────────

const GENERATION_TYPES = [
  {
    id: "marketplace",
    title: "Marketplace / fundo branco",
    description:
      "Ideal para imagem principal de anúncio em Shopee, Mercado Livre, Amazon, TikTok Shop, catálogo e loja virtual.",
    recommended:
      "Eletrônicos, acessórios, caixas, perfumes, cosméticos, produtos com embalagem e itens em geral.",
  },
  {
    id: "colored-bg",
    title: "Fundo colorido",
    description:
      "Ideal para destacar o produto com uma cor de fundo mais chamativa, mantendo visual limpo.",
    recommended:
      "Cosméticos, acessórios, copos, garrafas, itens pequenos, produtos de beleza e produtos com identidade visual forte.",
  },
  {
    id: "scene",
    title: "Cenário que combina com o produto",
    description:
      "Ideal para mostrar o produto em um ambiente de uso realista e mais vendedor.",
    recommended:
      "Perfumes, controles gamer, fones, garrafas, skincare, café, decoração, produtos fitness e itens de lifestyle.",
  },
  {
    id: "premium",
    title: "Estilo premium",
    description:
      "Ideal para criar uma imagem com aparência mais sofisticada, elegante e de alto valor.",
    recommended:
      "Perfumes, relógios, joias, óculos, cosméticos premium, bebidas, acessórios e produtos com embalagem bonita.",
  },
  {
    id: "social",
    title: "Redes sociais",
    description:
      "Ideal para anúncios, Instagram, TikTok Shop e criativos de tráfego pago, sem adicionar texto na imagem.",
    recommended:
      "Produtos chamativos, lançamentos, promoções, cosméticos, acessórios, eletrônicos e itens de venda rápida.",
  },
] as const;

type StyleId = (typeof GENERATION_TYPES)[number]["id"];

// ── Background colors ─────────────────────────────────────────────────────────

const BG_COLORS = [
  { id: "Branco",   hex: "#FFFFFF" },
  { id: "Preto",    hex: "#1a1a1a" },
  { id: "Bege",     hex: "#F5F0E8" },
  { id: "Cinza",    hex: "#9CA3AF" },
  { id: "Azul",     hex: "#3B82F6" },
  { id: "Verde",    hex: "#22C55E" },
  { id: "Rosa",     hex: "#EC4899" },
  { id: "Vermelho", hex: "#EF4444" },
  { id: "Amarelo",  hex: "#EAB308" },
  { id: "Roxo",     hex: "#A855F7" },
] as const;

type ColorId = (typeof BG_COLORS)[number]["id"];

// ── Icons ─────────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-emerald-400"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function PendingIcon() {
  return (
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
      className="shrink-0 text-zinc-600"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  initialCredits: number;
  freeTrialUsed: boolean;
  isLoggedIn: boolean;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function GenerateClient({ initialCredits, freeTrialUsed, isLoggedIn }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Style
  const [selectedStyle, setSelectedStyle] = useState<StyleId | null>(null);
  const [backgroundColorMode, setBackgroundColorMode] = useState<"auto" | "specific" | null>(null);
  const [backgroundColor, setBackgroundColor] = useState<ColorId | null>(null);

  // UI
  const [loadingStep, setLoadingStep] = useState<"uploading" | "checkout" | "generating" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [validationAttempted, setValidationAttempted] = useState(false);

  // Revoke object URL on cleanup
  useEffect(() => {
    const url = selectedImagePreview;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [selectedImagePreview]);

  // ── File handlers ─────────────────────────────────────────────────────────

  const ACCEPTED = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  function applyFile(file: File) {
    setFileError(null);
    if (!ACCEPTED.includes(file.type)) {
      setFileError("Formato não suportado. Use PNG, JPG, JPEG ou WEBP.");
      setSelectedFile(null);
      setSelectedImagePreview(null);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError("Arquivo muito grande. O tamanho máximo é 10 MB.");
      setSelectedFile(null);
      setSelectedImagePreview(null);
      return;
    }
    setSelectedFile(file);
    setSelectedImagePreview(URL.createObjectURL(file));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) applyFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) applyFile(file);
  }

  // ── Style handlers ────────────────────────────────────────────────────────

  function handleStyleSelect(id: StyleId) {
    setSelectedStyle(id);
    if (id !== "colored-bg") {
      setBackgroundColorMode(null);
      setBackgroundColor(null);
    }
  }

  // ── Validation ────────────────────────────────────────────────────────────

  function getValidationError(): string | null {
    if (!selectedFile) return "Selecione uma imagem do produto para continuar.";
    if (!selectedStyle) return "Escolha um tipo de geração para continuar.";
    if (selectedStyle === "colored-bg") {
      if (!backgroundColorMode) return "Escolha como você quer a cor do fundo.";
      if (backgroundColorMode === "specific" && !backgroundColor)
        return "Escolha uma cor para o fundo.";
    }
    return null;
  }

  // ── Upload helper ─────────────────────────────────────────────────────────

  async function uploadImage(): Promise<string | null> {
    if (!selectedFile) return null;
    setLoadingStep("uploading");

    const formData = new FormData();
    formData.append("file", selectedFile);

    const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
    const uploadData = await uploadRes.json();

    if (!uploadRes.ok) {
      setError(uploadData.error ?? "Erro ao enviar imagem. Tente novamente.");
      return null;
    }

    return uploadData.uploadKey as string;
  }

  // ── Checkout (fluxo avulso: PIX) ─────────────────────────────────────────

  async function handleCheckout() {
    if (!isLoggedIn) { requireLogin(); return; }
    setValidationAttempted(true);
    const validationError = getValidationError();
    if (validationError || loadingStep !== null) return;

    setError(null);

    try {
      const uploadKey = await uploadImage();
      if (selectedFile && uploadKey === null) return; // upload failed, error already set

      setLoadingStep("checkout");

      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedStyle, backgroundColorMode, backgroundColor, uploadKey }),
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
      setLoadingStep(null);
    }
  }

  // ── With-credit (usa 1 produto disponível, gera direto) ──────────────────

  async function handleWithCredit() {
    if (!isLoggedIn) { requireLogin(); return; }
    setValidationAttempted(true);
    const validationError = getValidationError();
    if (validationError || loadingStep !== null) return;

    setError(null);

    try {
      const uploadKey = await uploadImage();
      if (selectedFile && uploadKey === null) return;

      setLoadingStep("generating");

      const res = await fetch("/api/generate/with-credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedStyle, backgroundColorMode, backgroundColor, uploadKey }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          setError("Sem produtos disponíveis. Compre um pacote ou use o pagamento avulso.");
        } else {
          setError(data.error ?? "Erro ao gerar imagem. Tente novamente.");
        }
        return;
      }

      router.push(`/pay/${data.orderId}`);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoadingStep(null);
    }
  }

  // ── Trial (gera grátis com marca d'água) ─────────────────────────────────

  async function handleTrial() {
    if (!isLoggedIn) { requireLogin(); return; }
    setValidationAttempted(true);
    const validationError = getValidationError();
    if (validationError || loadingStep !== null) return;

    setError(null);

    try {
      const uploadKey = await uploadImage();
      if (selectedFile && uploadKey === null) return;

      setLoadingStep("generating");

      const res = await fetch("/api/generate/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedStyle, backgroundColorMode, backgroundColor, uploadKey }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erro ao gerar imagem. Tente novamente.");
        return;
      }

      router.push(`/pay/${data.orderId}`);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoadingStep(null);
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const validationError = getValidationError();
  const isLoading = loadingStep !== null;
  const canSubmit = !validationError && !isLoading;
  const selectedStyleLabel = GENERATION_TYPES.find((t) => t.id === selectedStyle)?.title;
  const hasCredits = isLoggedIn && initialCredits > 0;
  const canUseTrial = isLoggedIn && !freeTrialUsed;
  const canShowTrialCTA = !isLoggedIn || !freeTrialUsed;

  function requireLogin() {
    router.push("/login?callbackUrl=" + encodeURIComponent("/generate"));
  }

  function getLoadingLabel() {
    if (loadingStep === "uploading") return "Enviando imagem...";
    if (loadingStep === "generating") return "Gerando imagem… pode levar alguns segundos";
    return "Criando cobrança...";
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-5xl min-w-0">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm font-semibold text-emerald-400">Monetify</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
          Gere sua imagem profissional
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Envie a foto do produto, escolha o tipo de imagem e avance.
        </p>
      </div>

      {/* Checkout/network error */}
      {error && (
        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Main grid */}
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">

        {/* ── Left column ───────────────────────────────────────────────── */}
        <div className="min-w-0 space-y-5">

          {/* Step 1 — Upload */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6">
            <p className="mb-4 text-sm font-semibold text-zinc-100">
              1. Foto do produto
            </p>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-all",
                isDragging
                  ? "border-emerald-500 bg-emerald-500/5"
                  : "border-zinc-700 bg-zinc-800/50 hover:border-emerald-500/50 hover:bg-zinc-800"
              )}
            >
              {selectedImagePreview ? (
                <div className="flex flex-col items-center gap-3 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedImagePreview}
                    alt="Preview do produto"
                    className="max-h-48 max-w-full rounded-xl object-contain shadow-md"
                  />
                  <p className="text-xs text-zinc-400">
                    <span className="font-medium text-zinc-300">{selectedFile?.name}</span>
                    {" "}<span className="text-zinc-500">— clique para trocar</span>
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-zinc-400"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-zinc-300">
                      Clique ou arraste uma imagem
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">PNG, JPG, JPEG ou WEBP</p>
                  </div>
                </>
              )}
            </div>

            {fileError && (
              <p className="mt-2 text-xs text-red-400">{fileError}</p>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="sr-only"
              onChange={handleFileChange}
            />
          </div>

          {/* Step 2 — Generation type */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6">
            <p className="mb-1.5 text-sm font-semibold text-zinc-100">
              2. Tipo de geração
            </p>
            <p className="mb-4 text-xs leading-relaxed text-zinc-500">
              Não sabe qual escolher?{" "}
              <span className="font-medium text-zinc-400">Marketplace</span> para a imagem principal do anúncio.{" "}
              <span className="font-medium text-zinc-400">Premium</span> ou{" "}
              <span className="font-medium text-zinc-400">Cenário</span> para imagens extras que geram mais desejo.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {GENERATION_TYPES.map((type) => {
                const isSelected = selectedStyle === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleStyleSelect(type.id)}
                    className={cn(
                      "rounded-xl border p-3 sm:p-4 text-left transition-all",
                      isSelected
                        ? "border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/20"
                        : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-zinc-100">{type.title}</p>
                      {isSelected && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="shrink-0 text-emerald-400"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                      {type.description}
                    </p>
                    <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">
                      <span className="text-zinc-500">Para: </span>
                      {type.recommended}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3 — Color options (only for colored-bg) */}
          {selectedStyle === "colored-bg" && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6">
              <p className="mb-4 text-sm font-semibold text-zinc-100">
                3. Como você quer a cor do fundo?
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(
                  [
                    {
                      mode: "auto" as const,
                      title: "Escolher automaticamente",
                      desc: "A IA escolhe uma cor que combine com o produto.",
                    },
                    {
                      mode: "specific" as const,
                      title: "Escolher uma cor específica",
                      desc: "Você escolhe a cor do fundo.",
                    },
                  ] as const
                ).map((opt) => {
                  const isSelected = backgroundColorMode === opt.mode;
                  return (
                    <button
                      key={opt.mode}
                      type="button"
                      onClick={() => {
                        setBackgroundColorMode(opt.mode);
                        if (opt.mode === "auto") setBackgroundColor(null);
                      }}
                      className={cn(
                        "rounded-xl border p-3 sm:p-4 text-left transition-all",
                        isSelected
                          ? "border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/20"
                          : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-zinc-100">{opt.title}</p>
                        {isSelected && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="shrink-0 text-emerald-400"
                          >
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        )}
                      </div>
                      <p className="mt-1.5 text-xs text-zinc-400">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>

              {backgroundColorMode === "specific" && (
                <div className="mt-4 border-t border-zinc-800 pt-4">
                  <p className="mb-3 text-xs font-medium text-zinc-400">Escolha uma cor:</p>
                  <div className="flex flex-wrap gap-2">
                    {BG_COLORS.map((color) => {
                      const isSelected = backgroundColor === color.id;
                      return (
                        <button
                          key={color.id}
                          type="button"
                          title={color.id}
                          onClick={() => setBackgroundColor(color.id)}
                          className={cn(
                            "flex h-9 items-center gap-2 rounded-lg border px-3 transition-all",
                            isSelected
                              ? "border-emerald-500 ring-1 ring-emerald-500/40"
                              : "border-zinc-700 hover:border-zinc-500"
                          )}
                        >
                          <span
                            className="h-4 w-4 shrink-0 rounded-full border border-zinc-600"
                            style={{ backgroundColor: color.hex }}
                          />
                          <span className="text-xs font-medium text-zinc-300">{color.id}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right column ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl shadow-black/30 sm:p-6">
            <p className="mb-5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Resumo do pedido
            </p>

            {/* Summary checklist */}
            <div className="mb-5 space-y-2.5 rounded-xl border border-zinc-800 bg-zinc-800/50 px-4 py-3.5">
              <div className="flex items-center gap-2">
                {selectedImagePreview ? <CheckIcon /> : <PendingIcon />}
                <p className="text-xs text-zinc-400">
                  {selectedImagePreview ? "Imagem selecionada" : "Nenhuma imagem selecionada"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {selectedStyleLabel ? <CheckIcon /> : <PendingIcon />}
                <p className="min-w-0 truncate text-xs text-zinc-400">
                  {selectedStyleLabel
                    ? `Tipo: ${selectedStyleLabel}`
                    : "Nenhum tipo selecionado"}
                </p>
              </div>

              {selectedStyle === "colored-bg" && (
                <div className="flex items-center gap-2">
                  {backgroundColorMode ? <CheckIcon /> : <PendingIcon />}
                  <p className="text-xs text-zinc-400">
                    {backgroundColorMode === "auto"
                      ? "Cor: Automática"
                      : backgroundColorMode === "specific" && backgroundColor
                      ? `Cor: ${backgroundColor}`
                      : "Cor: não selecionada"}
                  </p>
                </div>
              )}
            </div>

            {/* Credits section */}
            {hasCredits ? (
              /* ── Has available products ─────────────────────────────── */
              <>
                {/* Credits info */}
                <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
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
                    className="shrink-0 text-emerald-400"
                  >
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                  <p className="min-w-0 text-xs text-zinc-300">
                    Você tem{" "}
                    <span className="font-bold text-emerald-400">
                      {initialCredits}{" "}
                      {initialCredits === 1 ? "produto disponível" : "produtos disponíveis"}
                    </span>
                  </p>
                </div>

                {/* Primary CTA: use credit */}
                <button
                  onClick={handleWithCredit}
                  disabled={isLoading}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition-all",
                    canSubmit
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600 active:scale-[0.98]"
                      : "cursor-not-allowed bg-zinc-800 text-zinc-500"
                  )}
                >
                  {isLoading ? (
                    <>
                      <Spinner />
                      {getLoadingLabel()}
                    </>
                  ) : (
                    "Usar 1 produto disponível"
                  )}
                </button>

                {/* Divider */}
                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-zinc-800" />
                  <p className="text-xs text-zinc-600">ou</p>
                  <div className="h-px flex-1 bg-zinc-800" />
                </div>

                {/* Secondary CTA: pay R$9,90 */}
                <button
                  onClick={handleCheckout}
                  disabled={isLoading}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-xl border px-6 py-2.5 text-sm font-medium transition-all",
                    canSubmit
                      ? "border-zinc-700 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
                      : "cursor-not-allowed border-zinc-800 text-zinc-600"
                  )}
                >
                  Comprar por R$ 9,90
                </button>

                {/* Tertiary: see packages */}
                <div className="mt-3 text-center">
                  <Link
                    href="/plans"
                    className="text-xs text-zinc-500 underline-offset-2 transition-colors hover:text-zinc-300 hover:underline"
                  >
                    Comprar mais produtos disponíveis
                  </Link>
                </div>
              </>
            ) : (
              /* ── No credits ──────────────────────────────────────────── */
              <>
                {/* Context-aware notice */}
                {isLoggedIn && canUseTrial ? (
                  <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
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
                      className="shrink-0 text-emerald-400"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                    <p className="min-w-0 text-xs text-zinc-300">
                      Você ainda tem{" "}
                      <span className="font-bold text-emerald-400">1 prévia grátis</span>{" "}
                      disponível
                    </p>
                  </div>
                ) : isLoggedIn ? (
                  <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2.5">
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
                      className="shrink-0 text-zinc-500"
                    >
                      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <path d="M16 10a4 4 0 0 1-8 0" />
                    </svg>
                    <p className="min-w-0 text-xs text-zinc-400">
                      Você não tem produtos disponíveis.{" "}
                      <Link
                        href="/plans"
                        className="text-emerald-400 underline-offset-2 hover:underline"
                      >
                        Ver pacotes
                      </Link>
                    </p>
                  </div>
                ) : null}

                {/* Price — only when trial is not the primary path */}
                {!canShowTrialCTA && (
                  <div className="mb-5 flex items-start justify-between">
                    <div>
                      <span className="text-3xl font-bold text-white">R$ 9,90</span>
                      <p className="mt-1 text-xs text-zinc-400">
                        2 prévias geradas • escolha 1 imagem final
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        Pagamento único, sem assinatura.
                      </p>
                    </div>
                    <span className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-400">
                      PIX
                    </span>
                  </div>
                )}

                {/* Primary CTA */}
                {canShowTrialCTA ? (
                  <>
                    <button
                      onClick={handleTrial}
                      disabled={isLoading}
                      className={cn(
                        "flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition-all",
                        canSubmit
                          ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600 active:scale-[0.98]"
                          : "cursor-not-allowed bg-zinc-800 text-zinc-500"
                      )}
                    >
                      {isLoading ? (
                        <>
                          <Spinner />
                          {getLoadingLabel()}
                        </>
                      ) : !selectedFile ? (
                        "Envie uma imagem para continuar"
                      ) : !selectedStyle ? (
                        "Escolha um tipo de imagem"
                      ) : selectedStyle === "colored-bg" && !backgroundColorMode ? (
                        "Escolha como será a cor do fundo"
                      ) : selectedStyle === "colored-bg" &&
                        backgroundColorMode === "specific" &&
                        !backgroundColor ? (
                        "Escolha uma cor"
                      ) : !isLoggedIn ? (
                        "Gere sua primeira prévia grátis"
                      ) : (
                        "Ver prévia grátis com marca d’água"
                      )}
                    </button>
                    <p className="mt-1.5 text-center text-[11px] text-zinc-600">
                      {!isLoggedIn
                        ? "Faça login apenas na hora de gerar"
                        : "Geração gratuita · pague R$ 9,90 só se gostar"}
                    </p>

                    <div className="my-3 flex items-center gap-3">
                      <div className="h-px flex-1 bg-zinc-800" />
                      <p className="text-xs text-zinc-600">ou</p>
                      <div className="h-px flex-1 bg-zinc-800" />
                    </div>

                    <button
                      onClick={handleCheckout}
                      disabled={isLoading}
                      className={cn(
                        "flex w-full items-center justify-center gap-2 rounded-xl border px-6 py-2.5 text-sm font-medium transition-all",
                        canSubmit
                          ? "border-zinc-700 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
                          : "cursor-not-allowed border-zinc-800 text-zinc-600"
                      )}
                    >
                      Comprar por R$ 9,90
                    </button>

                    <div className="mt-3 text-center">
                      <Link
                        href="/plans"
                        className="text-xs text-zinc-500 underline-offset-2 transition-colors hover:text-zinc-300 hover:underline"
                      >
                        Comprar mais produtos disponíveis
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleCheckout}
                      disabled={isLoading}
                      className={cn(
                        "flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition-all",
                        canSubmit
                          ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600 active:scale-[0.98]"
                          : "cursor-not-allowed bg-zinc-800 text-zinc-500"
                      )}
                    >
                      {isLoading ? (
                        <>
                          <Spinner />
                          {getLoadingLabel()}
                        </>
                      ) : !selectedFile ? (
                        "Envie uma imagem para continuar"
                      ) : !selectedStyle ? (
                        "Escolha um tipo de imagem"
                      ) : selectedStyle === "colored-bg" && !backgroundColorMode ? (
                        "Escolha como será a cor do fundo"
                      ) : selectedStyle === "colored-bg" &&
                        backgroundColorMode === "specific" &&
                        !backgroundColor ? (
                        "Escolha uma cor"
                      ) : (
                        "Continuar por R$ 9,90"
                      )}
                    </button>

                    <div className="mt-3 text-center">
                      <Link
                        href="/plans"
                        className="text-xs text-zinc-500 underline-offset-2 transition-colors hover:text-zinc-300 hover:underline"
                      >
                        Comprar mais produtos disponíveis
                      </Link>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Validation hint */}
            {validationAttempted && validationError && (
              <p className="mt-2.5 text-center text-xs text-amber-400">{validationError}</p>
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
              Sua imagem é usada apenas para gerar o resultado.
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
                <circle cx="12" cy="12" r="10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              Seu produto é mantido como foco, preservando formato, embalagem e identidade visual.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
