"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// ── Generation types ──────────────────────────────────────────────────────────

const GENERATION_TYPES = [
  {
    id: "marketplace",
    title: "Marketplace / fundo branco",
    description:
      "Ideal para Shopee, Mercado Livre e catálogos. Produto centralizado, fundo branco e sombra suave.",
  },
  {
    id: "colored-bg",
    title: "Fundo colorido",
    description:
      "Escolha uma cor específica ou deixe a IA selecionar uma cor que combine com o produto.",
  },
  {
    id: "scene",
    title: "Cenário que combina com o produto",
    description:
      "A IA cria um fundo profissional de acordo com o tipo do produto, mantendo o item como foco.",
  },
  {
    id: "premium",
    title: "Estilo premium",
    description:
      "Visual mais elegante, com iluminação sofisticada e aparência de marca.",
  },
  {
    id: "social",
    title: "Redes sociais",
    description:
      "Imagem mais chamativa para Instagram, TikTok Shop, stories e anúncios.",
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

// ── Internal prompt builder (not shown to user) ───────────────────────────────

function buildPrompt(
  style: StyleId | null,
  colorMode: "auto" | "specific" | null,
  color: ColorId | null
): string {
  switch (style) {
    case "marketplace":
      return "produto com fundo branco limpo, centralizado, sombra suave, estilo profissional para marketplace";
    case "colored-bg":
      if (colorMode === "specific" && color)
        return `produto com fundo ${color.toLowerCase()}, cor lisa e limpa, produto em destaque`;
      return "produto com fundo colorido escolhido pela IA que combine com o produto, cor harmoniosa";
    case "scene":
      return "produto com cenário de fundo profissional que combine com o tipo do produto, fundo contextual, produto em destaque";
    case "premium":
      return "produto com iluminação sofisticada, visual elegante e premium, aparência de marca de alto padrão";
    case "social":
      return "produto com visual chamativo para redes sociais, Instagram e TikTok Shop, dinâmico e atraente";
    default:
      return "";
  }
}

// ── Checkmark icon ────────────────────────────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GeneratePage() {
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationAttempted, setValidationAttempted] = useState(false);

  // Revoke object URL when preview changes or component unmounts
  useEffect(() => {
    const url = selectedImagePreview;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [selectedImagePreview]);

  // ── File handlers ─────────────────────────────────────────────────────────

  const ACCEPTED = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

  function applyFile(file: File) {
    if (!ACCEPTED.includes(file.type)) return;
    setSelectedFile(file);
    setSelectedImagePreview(URL.createObjectURL(file));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) applyFile(file);
    // reset input so same file can be re-selected
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

  // ── Checkout ──────────────────────────────────────────────────────────────

  async function handleCheckout() {
    setValidationAttempted(true);
    const validationError = getValidationError();
    if (validationError || isLoading) return;

    setIsLoading(true);
    setError(null);

    const prompt = buildPrompt(selectedStyle, backgroundColorMode, backgroundColor);

    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
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

  // ── Button label ──────────────────────────────────────────────────────────

  function getButtonLabel(): string {
    if (!selectedFile) return "Envie uma imagem para continuar";
    if (!selectedStyle) return "Escolha um tipo de imagem";
    if (selectedStyle === "colored-bg") {
      if (!backgroundColorMode) return "Escolha como será a cor do fundo";
      if (backgroundColorMode === "specific" && !backgroundColor) return "Escolha uma cor";
    }
    return "Continuar por R$ 9,90";
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const validationError = getValidationError();
  const canSubmit = !validationError && !isLoading;
  const selectedStyleLabel = GENERATION_TYPES.find((t) => t.id === selectedStyle)?.title;

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
          Envie a foto do produto, escolha o tipo de imagem e avance para o pagamento.
        </p>
      </div>

      {/* Checkout/network error */}
      {error && (
        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Main grid: left = steps, right = summary+CTA */}
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
            <p className="mb-4 text-sm font-semibold text-zinc-100">
              2. Tipo de geração
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

              {/* Color swatches */}
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
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl shadow-black/30">
            <p className="mb-5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Resumo do pedido
            </p>

            {/* Summary items */}
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

            {/* Price */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <span className="text-3xl font-bold text-white">R$ 9,90</span>
                <p className="mt-1 text-xs text-zinc-400">2 prévias geradas • escolha 1 imagem final</p>
                <p className="mt-0.5 text-xs text-zinc-500">Pagamento único, sem assinatura.</p>
              </div>
              <span className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-400">
                PIX
              </span>
            </div>

            {/* CTA */}
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
                getButtonLabel()
              )}
            </button>

            {/* Inline validation hint */}
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
