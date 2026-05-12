import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getPresignedUrl,
  downloadFromS3,
  uploadRawToS3,
  buildWatermarkKey,
} from "@/lib/s3";
import { applyWatermark } from "@/lib/watermark";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  const { imageId } = await params;

  const image = await prisma.generatedImage.findUnique({
    where: { id: imageId },
    select: {
      userId: true,
      s3Key: true,
      imageUrl: true,
      watermarkKey: true,
      orderPrev: { select: { id: true, isTrial: true, paymentStatus: true } },
    },
  });

  if (!image || image.userId !== session.user.id) {
    return new NextResponse("Imagem não encontrada", { status: 404 });
  }

  const isUnpaidTrial =
    image.orderPrev?.isTrial && image.orderPrev.paymentStatus !== "PAID";

  const order = image.orderPrev;

  if (isUnpaidTrial) {
    // Fast path: cached watermark already in S3
    if (image.watermarkKey) {
      const redirectKey = image.watermarkKey;
      console.log("[preview] redirecting", {
        imageId,
        isTrial: order?.isTrial,
        paymentStatus: order?.paymentStatus,
        s3Key: image.s3Key,
        watermarkKey: image.watermarkKey,
        redirectKey,
      });
      const url = await getPresignedUrl(redirectKey);
      return NextResponse.redirect(url);
    }

    // Slow path: generate watermark on demand, cache for subsequent requests
    console.log("[preview] on-demand watermark", {
      imageId,
      userId: session.user.id,
      orderId: order?.id,
      isTrial: order?.isTrial,
      paymentStatus: order?.paymentStatus,
      s3Key: image.s3Key,
    });

    const source = await resolveImageSource(image.s3Key, image.imageUrl);
    if (!source) {
      console.warn(
        `[images/preview] no image source for imageId=${imageId} s3Key=${image.s3Key ?? "null"} imageUrl=${image.imageUrl ?? "null"}`
      );
      return new NextResponse("Prévia indisponível", { status: 403 });
    }

    try {
      const watermarked = await applyWatermark(source);
      const wKey = buildWatermarkKey(image.userId, imageId);
      await uploadRawToS3(watermarked, wKey, "image/png");
      await prisma.generatedImage.update({
        where: { id: imageId },
        data: { watermarkKey: wKey },
      });
      const redirectKey = wKey;
      console.log("[preview] redirecting", {
        imageId,
        isTrial: order?.isTrial,
        paymentStatus: order?.paymentStatus,
        s3Key: image.s3Key,
        watermarkKey: wKey,
        redirectKey,
      });
      const url = await getPresignedUrl(redirectKey);
      return NextResponse.redirect(url);
    } catch (err) {
      console.error(`[images/preview] on-demand watermark failed imageId=${imageId}:`, err);
      return new NextResponse("Erro ao gerar prévia", { status: 503 });
    }
  }

  // Paid order or non-trial: serve clean image
  if (!image.s3Key) {
    return new NextResponse("Imagem sem arquivo", { status: 404 });
  }

  const redirectKey = image.s3Key;
  console.log("[preview] redirecting", {
    imageId,
    isTrial: order?.isTrial,
    paymentStatus: order?.paymentStatus,
    s3Key: image.s3Key,
    watermarkKey: image.watermarkKey,
    redirectKey,
  });
  const url = await getPresignedUrl(redirectKey);
  return NextResponse.redirect(url);
}

async function resolveImageSource(
  s3Key: string | null,
  imageUrl: string | null
): Promise<Buffer | null> {
  if (s3Key) {
    return downloadFromS3(s3Key).catch(() => null);
  }
  if (imageUrl) {
    try {
      const res = await fetch(imageUrl, { next: { revalidate: 0 } });
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch {
      return null;
    }
  }
  return null;
}
