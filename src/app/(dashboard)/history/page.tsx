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

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const orders = await prisma.order.findMany({
    where: {
      userId: session.user.id,
      paymentStatus: "PAID",
      generationStatus: "COMPLETED",
      imageId: { not: null },
    },
    select: {
      id: true,
      amount: true,
      prompt: true,
      createdAt: true,
      image: {
        select: {
          id: true,
          imageUrl: true,
          s3Key: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Resolve display URLs: presigned for S3 images, direct for mock images
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
        createdAt: order.createdAt,
        hasS3: !!img?.s3Key,
        downloadUrl: img?.s3Key ? displayUrl : (img?.imageUrl ?? null),
      };
    })
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Histórico</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Suas imagens geradas com o Monetify
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 py-20 text-center">
          <p className="text-4xl">🖼️</p>
          <h2 className="mt-4 text-base font-semibold text-zinc-700">
            Nenhuma imagem gerada ainda
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
          {items.map((item) => (
            <div
              key={item.orderId}
              className="overflow-hidden rounded-xl border border-zinc-200 bg-white"
            >
              <div className="relative aspect-square bg-zinc-100">
                {item.displayUrl ? (
                  <Image
                    src={item.displayUrl}
                    alt={item.prompt ?? "Imagem gerada"}
                    fill
                    className="object-cover"
                    unoptimized={!item.hasS3}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                    Imagem indisponível
                  </div>
                )}
              </div>

              <div className="p-4">
                {item.prompt && (
                  <p className="line-clamp-2 text-sm text-zinc-700" title={item.prompt}>
                    {item.prompt}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
                  <span>{formatDate(item.createdAt)}</span>
                  <span>{formatAmount(item.amount)}</span>
                </div>

                {item.downloadUrl && (
                  <a
                    href={item.downloadUrl}
                    download={`monetify-${item.imageId}.png`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex w-full items-center justify-center rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                  >
                    Baixar imagem
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
