import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPresignedUrl } from "@/lib/s3";
import { resolveGenerationLabel } from "@/lib/generation-labels";
import { PayClient } from "./PayClient";

export default async function PayPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      amount: true,
      paymentStatus: true,
      generationStatus: true,
      pixBrCode: true,
      pixBrCodeBase64: true,
      pixExpiresAt: true,
      prompt: true,
      imageId: true,
      image: {
        select: { id: true, imageUrl: true, s3Key: true },
      },
      images: {
        select: { id: true, imageUrl: true, s3Key: true },
      },
    },
  });

  if (!order || order.userId !== session.user.id) {
    notFound();
  }

  // Resolve chosen image URL (old flow: imageId set directly; new flow: set after user chooses)
  let initialImageUrl: string | null = null;
  const img = order.image;
  if (img) {
    if (img.s3Key) {
      initialImageUrl = await getPresignedUrl(img.s3Key).catch(() => null);
    } else if (img.imageUrl) {
      initialImageUrl = img.imageUrl;
    }
  }

  // Resolve preview URLs when COMPLETED but user hasn't chosen yet (new 2-preview flow)
  let initialPreviews: { imageId: string; imageUrl: string }[] = [];
  if (order.generationStatus === "COMPLETED" && !order.imageId && order.images.length > 0) {
    initialPreviews = await Promise.all(
      order.images.map(async (preview) => {
        let url = preview.imageUrl;
        if (preview.s3Key) {
          url = await getPresignedUrl(preview.s3Key).catch(() => preview.imageUrl);
        }
        return { imageId: preview.id, imageUrl: url };
      })
    );
  }

  const generationLabel = resolveGenerationLabel(order.prompt);

  return (
    <PayClient
      orderId={order.id}
      amount={order.amount}
      generationTitle={generationLabel.title}
      generationDescription={generationLabel.description}
      pixBrCode={order.pixBrCode ?? ""}
      pixBrCodeBase64={order.pixBrCodeBase64 ?? ""}
      pixExpiresAt={order.pixExpiresAt?.toISOString() ?? null}
      initialPaymentStatus={order.paymentStatus}
      initialGenerationStatus={order.generationStatus}
      initialImageUrl={initialImageUrl}
      initialImageId={img?.id ?? null}
      initialPreviews={initialPreviews}
      isDevEnvironment={process.env.NODE_ENV === "development"}
    />
  );
}
