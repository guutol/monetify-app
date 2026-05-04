import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPresignedUrl } from "@/lib/s3";

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
  COMPLETED:  { label: "Gerada",      className: "bg-green-100 text-green-700" },
  FAILED:     { label: "Falhou",      className: "bg-red-100 text-red-700" },
  PROCESSING: { label: "Gerando…",   className: "bg-blue-100 text-blue-700" },
  PENDING:    { label: "Aguardando", className: "bg-yellow-100 text-yellow-700" },
} as const;

type GenerationStatus = keyof typeof GENERATION_STATUS_CONFIG;

function StatusBadge({ status }: { status: string }) {
  const cfg = GENERATION_STATUS_CONFIG[status as GenerationStatus] ?? {
    label: status,
    className: "bg-zinc-100 text-zinc-600",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
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
        prompt: order.prompt,
        amount: order.amount,
        generationStatus: order.generationStatus,
        createdAt: order.createdAt,
        hasS3: !!img?.s3Key,
      };
    })
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Histórico</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Suas gerações de imagem com o Monetify
          </p>
        </div>
        <Link
          href="/generate"
          className="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
        >
          Nova imagem
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 py-20 text-center">
          <p className="text-4xl">🖼️</p>
          <h2 className="mt-4 text-base font-semibold text-zinc-700">
            Nenhuma geração ainda
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Gere sua primeira imagem de produto com IA
          </p>
          <Link
            href="/generate"
            className="mt-6 inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
          >
            Gerar imagem
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const isCompleted = item.generationStatus === "COMPLETED";
            const isFailed = item.generationStatus === "FAILED";

            return (
              <div
                key={item.orderId}
                className="overflow-hidden rounded-xl border border-zinc-200 bg-white"
              >
                {/* Image area */}
                <div className="relative aspect-square bg-zinc-100">
                  {isCompleted && item.displayUrl ? (
                    <Image
                      src={item.displayUrl}
                      alt={item.prompt ?? "Imagem gerada"}
                      fill
                      className="object-cover"
                      unoptimized={!item.hasS3}
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
                      <span className="text-3xl">
                        {isFailed ? "❌" : "⏳"}
                      </span>
                      <p className="text-xs text-zinc-400">
                        {isFailed
                          ? "Geração falhou"
                          : "Aguardando geração"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    {item.prompt && (
                      <p
                        className="line-clamp-2 flex-1 text-sm text-zinc-700"
                        title={item.prompt}
                      >
                        {item.prompt}
                      </p>
                    )}
                    <StatusBadge status={item.generationStatus} />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
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
                        className="flex w-full items-center justify-center rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                      >
                        Baixar imagem
                      </a>
                    )}

                    {/* Ver resultado / Tentar novamente */}
                    <Link
                      href={`/pay/${item.orderId}`}
                      className="flex w-full items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
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
