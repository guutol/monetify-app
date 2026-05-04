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

const STATUS_PAYMENT_LABEL: Record<string, string> = {
  PENDING: "Aguardando",
  PAID: "Pago",
  EXPIRED: "Expirado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
  FAILED: "Falhou",
};

const STATUS_GENERATION_LABEL: Record<string, string> = {
  PENDING: "Aguardando geração",
  PROCESSING: "Gerando...",
  COMPLETED: "Gerado",
  FAILED: "Falhou",
};

const STATUS_GENERATION_COLOR: Record<string, string> = {
  PENDING: "text-zinc-400",
  PROCESSING: "text-blue-500",
  COMPLETED: "text-green-600",
  FAILED: "text-red-500",
};

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

  const totalPaid = stats
    .filter((s) => s.paymentStatus === "PAID")
    .reduce((sum, s) => sum + s._count.id, 0);

  const totalCompleted = stats
    .filter((s) => s.generationStatus === "COMPLETED")
    .reduce((sum, s) => sum + s._count.id, 0);

  const totalPending = stats
    .filter((s) => s.generationStatus === "PENDING" && s.paymentStatus === "PAID")
    .reduce((sum, s) => sum + s._count.id, 0);

  const totalFailed = stats
    .filter((s) => s.generationStatus === "FAILED")
    .reduce((sum, s) => sum + s._count.id, 0);

  const hasAnyOrder = recentOrders.length > 0;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Olá, {session.user.name?.split(" ")[0] ?? "usuário"}
          </p>
        </div>
        <Link
          href="/generate"
          className="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
        >
          + Gerar imagem
        </Link>
      </div>

      {/* Stats cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Imagens geradas" value={totalCompleted} color="text-green-600" />
        <StatCard label="Pedidos pagos" value={totalPaid} color="text-zinc-900" />
        <StatCard label="Gerações pendentes" value={totalPending} color="text-amber-500" />
        <StatCard label="Gerações com falha" value={totalFailed} color="text-red-500" />
      </div>

      {/* Recent orders */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-zinc-800">Pedidos recentes</h2>
        {hasAnyOrder && (
          <Link href="/history" className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors">
            Ver histórico →
          </Link>
        )}
      </div>

      {!hasAnyOrder ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 py-16 text-center">
          <p className="text-3xl">🖼️</p>
          <p className="mt-3 text-sm font-medium text-zinc-700">Nenhum pedido ainda</p>
          <p className="mt-1 text-sm text-zinc-400">Crie sua primeira imagem de produto com IA</p>
          <Link
            href="/generate"
            className="mt-5 inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
          >
            Gerar imagem
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {recentOrders.map((order, i) => {
            const imageUrl = order.image?.imageUrl || null;
            const isLast = i === recentOrders.length - 1;

            return (
              <div
                key={order.id}
                className={`flex items-center gap-4 px-4 py-3 ${!isLast ? "border-b border-zinc-100" : ""}`}
              >
                {/* Thumbnail */}
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={order.prompt ?? "Imagem"}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg text-zinc-300">
                      🖼
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-800">
                    {order.prompt ?? "—"}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-400">
                    <span>{formatDate(order.createdAt)}</span>
                    <span>·</span>
                    <span
                      className={STATUS_GENERATION_COLOR[order.generationStatus] ?? "text-zinc-400"}
                    >
                      {STATUS_GENERATION_LABEL[order.generationStatus] ?? order.generationStatus}
                    </span>
                    <span>·</span>
                    <span>{STATUS_PAYMENT_LABEL[order.paymentStatus] ?? order.paymentStatus}</span>
                  </div>
                </div>

                {/* Action */}
                {order.generationStatus === "COMPLETED" && imageUrl && (
                  <a
                    href={imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                  >
                    Ver
                  </a>
                )}
                {order.paymentStatus === "PENDING" && (
                  <Link
                    href={`/pay/${order.id}`}
                    className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                  >
                    Pagar
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
