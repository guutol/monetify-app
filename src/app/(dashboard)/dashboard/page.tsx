import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING:   { label: "Aguardando PIX", className: "border border-amber-500/30 bg-amber-500/10 text-amber-400" },
  PAID:      { label: "Pago",           className: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400" },
  EXPIRED:   { label: "Expirado",       className: "border border-zinc-700 bg-zinc-800 text-zinc-500" },
  CANCELLED: { label: "Cancelado",      className: "border border-zinc-700 bg-zinc-800 text-zinc-500" },
  REFUNDED:  { label: "Reembolsado",    className: "border border-zinc-700 bg-zinc-800 text-zinc-500" },
  FAILED:    { label: "Falhou",         className: "border border-red-500/30 bg-red-500/10 text-red-400" },
};

const GENERATION_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING:    { label: "Na fila",   className: "border border-amber-500/30 bg-amber-500/10 text-amber-400" },
  PROCESSING: { label: "Gerando…", className: "border border-blue-500/30 bg-blue-500/10 text-blue-400" },
  COMPLETED:  { label: "Gerada",   className: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400" },
  FAILED:     { label: "Falhou",   className: "border border-red-500/30 bg-red-500/10 text-red-400" },
};

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  const [stats, recentOrders] = await Promise.all([
    prisma.order.groupBy({
      by: ["generationStatus", "paymentStatus"],
      where: { userId },
      _count: { id: true },
    }),
    prisma.order.findMany({
      where: { userId },
      select: {
        id: true,
        amount: true,
        paymentStatus: true,
        generationStatus: true,
        prompt: true,
        createdAt: true,
        image: {
          select: { imageUrl: true, s3Key: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const totalOrders = stats.reduce((sum, s) => sum + s._count.id, 0);

  const totalCompleted = stats
    .filter((s) => s.generationStatus === "COMPLETED")
    .reduce((sum, s) => sum + s._count.id, 0);

  const totalProcessing = stats
    .filter(
      (s) =>
        s.paymentStatus === "PAID" &&
        (s.generationStatus === "PENDING" || s.generationStatus === "PROCESSING")
    )
    .reduce((sum, s) => sum + s._count.id, 0);

  const totalFailed = stats
    .filter((s) => s.generationStatus === "FAILED")
    .reduce((sum, s) => sum + s._count.id, 0);

  const hasAnyOrder = recentOrders.length > 0;
  const firstName = session.user.name?.split(" ")[0] ?? "usuário";

  return (
    /* -m-8 cancels DashboardLayout's p-8 so the dark bg fills the full area */
    <div className="-m-8 min-h-screen overflow-x-hidden bg-zinc-950 px-6 py-10 lg:px-10">
      <div className="mx-auto max-w-5xl">

        {/* Page header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-400">Monetify</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
              Dashboard
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Olá, {firstName}. Acompanhe suas imagens, pedidos e resultados recentes.
            </p>
          </div>
          <Link
            href="/generate"
            className="shrink-0 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-[0.98]"
          >
            Nova imagem
          </Link>
        </div>

        {/* Stats grid */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Total de pedidos"
            value={totalOrders}
            accent="text-white"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            }
          />
          <StatCard
            label="Imagens geradas"
            value={totalCompleted}
            accent="text-emerald-400"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            }
          />
          <StatCard
            label="Em processamento"
            value={totalProcessing}
            accent="text-amber-400"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
          />
          <StatCard
            label="Gerações com falha"
            value={totalFailed}
            accent="text-red-400"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            }
          />
        </div>

        {/* Recent orders header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Pedidos recentes</h2>
          {hasAnyOrder && (
            <Link
              href="/history"
              className="text-sm text-zinc-500 transition-colors hover:text-white"
            >
              Ver histórico →
            </Link>
          )}
        </div>

        {!hasAnyOrder ? (
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
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <h2 className="mt-5 text-base font-semibold text-white">
              Nenhum pedido ainda
            </h2>
            <p className="mt-1.5 text-sm text-zinc-400">
              Gere sua primeira imagem profissional para começar.
            </p>
            <Link
              href="/generate"
              className="mt-6 inline-flex items-center rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-[0.98]"
            >
              Gerar primeira imagem
            </Link>
          </div>
        ) : (
          /* ── Recent order list ───────────────────────────── */
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
            {recentOrders.map((order, i) => {
              const imageUrl = order.image?.imageUrl || null;
              const isLast = i === recentOrders.length - 1;
              const isPaid = order.paymentStatus === "PAID";
              const isCompleted = order.generationStatus === "COMPLETED";
              const isFailed = order.generationStatus === "FAILED" && isPaid;
              const awaitingPayment = order.paymentStatus === "PENDING";

              // Show generation badge if paid, payment badge otherwise
              const badgeCfg = isPaid
                ? GENERATION_STATUS_CONFIG[order.generationStatus]
                : PAYMENT_STATUS_CONFIG[order.paymentStatus];

              return (
                <div
                  key={order.id}
                  className={`flex items-center gap-4 px-5 py-4 ${
                    !isLast ? "border-b border-zinc-800" : ""
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
                    {isCompleted && imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={order.prompt ?? "Imagem"}
                        width={44}
                        height={44}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-zinc-600"
                        >
                          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                          <circle cx="9" cy="9" r="2" />
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-200">
                      {order.prompt ?? "—"}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-zinc-500">
                        {formatDate(order.createdAt)}
                      </span>
                      {badgeCfg && (
                        <Badge label={badgeCfg.label} className={badgeCfg.className} />
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="shrink-0">
                    {awaitingPayment && (
                      <Link
                        href={`/pay/${order.id}`}
                        className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
                      >
                        Pagar
                      </Link>
                    )}
                    {isCompleted && (
                      <Link
                        href={`/pay/${order.id}`}
                        className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                      >
                        Ver resultado
                      </Link>
                    )}
                    {isFailed && (
                      <Link
                        href={`/pay/${order.id}`}
                        className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-600"
                      >
                        Tentar novamente
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: number;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs text-zinc-500">{label}</p>
        <div className="shrink-0 text-zinc-600">{icon}</div>
      </div>
      <p className={`text-3xl font-bold tabular-nums ${accent}`}>{value}</p>
    </div>
  );
}
