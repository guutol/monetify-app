import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Dev-only: POST /api/dev/watermark-reset
 * Clears watermarkKey for trial images so they get regenerated with the latest watermark.
 * Body (optional): { imageId: string } — reset a single image; omit to reset all trial images for the current user.
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let imageId: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    imageId = body.imageId;
  } catch {
    // no body is fine
  }

  if (imageId) {
    const image = await prisma.generatedImage.findUnique({
      where: { id: imageId },
      select: { userId: true, watermarkKey: true },
    });
    if (!image || image.userId !== session.user.id) {
      return NextResponse.json({ error: "Imagem não encontrada" }, { status: 404 });
    }
    await prisma.generatedImage.update({
      where: { id: imageId },
      data: { watermarkKey: null },
    });
    return NextResponse.json({ ok: true, reset: 1, clearedKey: image.watermarkKey });
  }

  // Reset all trial images for the current user that have a cached watermarkKey
  const result = await prisma.generatedImage.updateMany({
    where: {
      userId: session.user.id,
      watermarkKey: { not: null },
      orderPrev: { isTrial: true, paymentStatus: { not: "PAID" } },
    },
    data: { watermarkKey: null },
  });

  return NextResponse.json({ ok: true, reset: result.count });
}
