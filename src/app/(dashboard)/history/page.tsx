import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPresignedUrl } from "@/lib/s3";
import { resolveGenerationLabel } from "@/lib/generation-labels";

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const GENERATION_STATUS_CONFIG = {
  COMPLETED:  { label: "Gerada",     className: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400" },
  FAILED:     { label: "Falhou",     className: "border border-red-500/30 bg-red-500/10 text-red-400" },
  PROCESSING: { label: "Gerando…",  className: "border border-blue-500/30 bg-blue-500/10 text-blue-400" },
  PENDING:    { label: "Aguardando", className: "border border-amber-500/30 bg-amber-500/10 text-amber-400" },
} as const;

type GenerationStatus = keyof typeof GENERATION_STATUS_CONFIG;

function StatusBadge({ status }: { status: string }) {
  const cfg = GENERATION_STATUS_CONFIG[status as GenerationStatus] ?? {
    label: status,
    className: "border border-zinc-700 bg-zinc-800 text-zinc-400",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Show all paid orders regardless of generation status so the user
  // can track failed ones and retry from the /pay page
  const orders = await prisma.order.findMany({
    where: {
      userId: session.user.id,
      paymentStatus: "PAID",
    },
    select: {
      id: true,
      amount: true,
      prompt: true,
      generationStatus: true,
      createdAt: true,
      image: {
        select: { id: true, imageUrl: true, s3Key: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const items = await Promise.all(
    orders.map(async (order) => {
      const img = order.image;
      let displayUrl: string | null = null;

      if (img?.s3Key) {
        displayUrl = await getPresignedUrl(img.s3Key).catch(() => null);
      } else if (img?.imageUrl) {
        displayUrl = img.imageUrl;
      }

      return {
        orderId: order.id,
        imageId: img?.id ?? null,
        displayUrl,
        label: resolveGenerationLabel(order.prompt),
        amount: order.amount,
        generationStatus: order.generationStatus,
        createdAt: order.createdAt,
        hasS3: !!img?.s3Key,
      };
    })
  );

  return (
    <div className="mx-auto w-full max-w-5xl min-w-0">

        {/* Page header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-400">Monetify</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
              Histórico de imagens
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Acompanhe seus pedidos, baixe resultados e tente novamente quando necessário.
            </p>
          </div>
          <Link
            href="/generate"
            className="shrink-0 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-[0.98]"
          >
            Nova imagem
          </Link>
        </div>

        {items.length === 0 ? (
          /* ── Empty state ─────────────────────────────────── */
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 py-20 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-zinc-500"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </div>
            <h2 className="mt-5 text-base font-semibold text-white">
              Nenhuma imagem gerada ainda
            </h2>
            <p className="mt-1.5 text-sm text-zinc-400">
              Comece criando sua primeira imagem profissional para vender melhor.
            </p>
            <Link
              href="/generate"
              className="mt-6 inline-flex items-center rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-[0.98]"
            >
              Gerar primeira imagem
            </Link>
          </div>
        ) : (
          /* ── Order grid ──────────────────────────────────── */
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const isCompleted = item.generationStatus === "COMPLETED";
              const isFailed    = item.generationStatus === "FAILED";
              const isProcessing = item.generationStatus === "PROCESSING";

              return (
                <div
                  key={item.orderId}
                  className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-xl shadow-black/20"
                >
                  {/* Image preview area */}
                  <div className="relative h-48 sm:h-56 bg-zinc-800">
                    {isCompleted && item.displayUrl ? (
                      <Image
                        src={item.displayUrl}
                        alt={item.label.title}
                        fill
                        className="object-cover"
                        unoptimized={!item.hasS3}
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
                        {isFailed ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-red-500/40"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                          </svg>
                        ) : isProcessing ? (
                          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500" />
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-amber-500/40"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                        )}
                        <p className="text-xs text-zinc-500">
                          {isFailed
                            ? "Geração falhou"
                            : isProcessing
                            ? "Gerando…"
                            : "Aguardando geração"}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="p-4">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-zinc-200">
                          {item.label.title}
                        </p>
                        {item.label.description && (
                          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-zinc-500">
                            {item.label.description}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={item.generationStatus} />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                      <span>{formatDate(item.createdAt)}</span>
                      <span>{formatAmount(item.amount)}</span>
                    </div>

                    <div className="mt-3 flex flex-col gap-2">
                      {/* Download: only for completed images */}
                      {isCompleted && item.displayUrl && (
                        <a
                          href={item.displayUrl}
                          download={`monetify-${item.imageId ?? item.orderId}.png`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          Baixar imagem
                        </a>
                      )}

                      {/* Ver resultado / Tentar novamente */}
                      <Link
                        href={`/pay/${item.orderId}`}
                        className={`flex w-full items-center justify-center rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                          isFailed
                            ? "bg-emerald-500 text-white hover:bg-emerald-600"
                            : "border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                        }`}
                      >
                        {isFailed ? "Tentar novamente" : "Ver resultado"}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}
