import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPresignedUrl } from "@/lib/s3";
import { resolveGenerationLabel } from "@/lib/generation-labels";
import { getPlanById, type PlanId } from "@/config/pricing";
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

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: session.user.id },
    select: {
      id: true,
      amount: true,
      paymentStatus: true,
      generationStatus: true,
      pixBrCode: true,
      pixBrCodeBase64: true,
      pixExpiresAt: true,
      prompt: true,
      imageId: true,
      orderType: true,
      planId: true,
      isTrial: true,
      image: {
        select: { id: true, imageUrl: true, s3Key: true },
      },
      images: {
        select: { id: true, imageUrl: true, s3Key: true, watermarkKey: true },
      },
    },
  });

  if (!order) {
    notFound();
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[pay] userId=${session.user.id} orderId=${orderId}`);
  }

  // ── PACKAGE order: resolve plan info + activation status ─────────────────
  let planLabel = "";
  let productsCount = 0;
  let packageActivated = false;

  if (order.orderType === "PACKAGE") {
    if (order.planId) {
      const plan = getPlanById(order.planId as PlanId);
      planLabel = plan?.label ?? "";
      productsCount = plan?.productsCount ?? 0;
    }

    if (order.paymentStatus === "PAID") {
      const creditTx = await prisma.creditTransaction.findFirst({
        where: { orderId: order.id, userId: session.user.id, type: "PURCHASED" },
        select: { id: true },
      });
      packageActivated = creditTx !== null;
    }
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

  // Resolve preview URLs when COMPLETED but user hasn't chosen yet (new 2-preview flow).
  // Never expose clean presigned URLs to an unpaid trial order.
  let initialPreviews: { imageId: string; imageUrl: string }[] = [];
  if (
    order.generationStatus === "COMPLETED" &&
    !order.imageId &&
    order.images.length > 0 &&
    (!order.isTrial || order.paymentStatus === "PAID")
  ) {
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

  // Watermarked previews for trial orders (shown before payment).
  // The client uses /api/images/{id}/preview — that route handles auth, watermarking
  // and caches the result. Never expose s3Key or imageUrl directly here.
  let initialWatermarkedPreviews: { imageId: string; imageUrl: string }[] = [];
  if (order.isTrial && order.paymentStatus !== "PAID" && order.images.length > 0) {
    initialWatermarkedPreviews = order.images.map((preview) => ({
      imageId: preview.id,
      imageUrl: `/api/images/${preview.id}/preview`,
    }));
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[pay] orderId=${order.id} isTrial=${order.isTrial} paymentStatus=${order.paymentStatus}` +
      ` generationStatus=${order.generationStatus} imageId=${order.imageId ?? "none"}` +
      ` previewCount=${order.images.length} watermarkedPreviews=${initialWatermarkedPreviews.length}`
    );
    for (const p of order.images) {
      console.log(
        `[pay] preview imageId=${p.id} watermarkKey=${p.watermarkKey ?? "MISSING"} s3Key=${p.s3Key ?? "MISSING"}`
      );
    }
  }

  const generationLabel = resolveGenerationLabel(order.prompt);

  return (
    <PayClient
      orderId={order.id}
      amount={order.amount}
      orderType={order.orderType}
      planLabel={planLabel}
      productsCount={productsCount}
      packageActivated={packageActivated}
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
      isTrial={order.isTrial}
      initialWatermarkedPreviews={initialWatermarkedPreviews}
      userEmail={session.user.email ?? null}
      isDevEnvironment={
        process.env.NODE_ENV !== "production" &&
        process.env.NEXT_PUBLIC_SHOW_DEV_TOOLS === "true"
      }
    />
  );
}
