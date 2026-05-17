import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { orderId } = await params;
  const body = await req.json().catch(() => null);
  const imageId = typeof body?.imageId === "string" ? body.imageId.trim() : null;

  if (!imageId) {
    return NextResponse.json({ error: "imageId obrigatório" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      userId: true,
      orderType: true,
      isTrial: true,
      paymentStatus: true,
      generationStatus: true,
      images: { select: { id: true } },
    },
  });

  if (!order || order.userId !== session.user.id) {
    console.error(`[choose] order not found or forbidden orderId=${orderId} userId=${session.user.id}`);
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  console.log("[choose] request", {
    orderId,
    userId: session.user.id,
    imageId,
    orderType: order.orderType,
    isTrial: order.isTrial,
    paymentStatus: order.paymentStatus,
    generationStatus: order.generationStatus,
    availableImageIds: order.images.map((i) => i.id),
  });

  if (order.generationStatus !== "COMPLETED") {
    console.error(`[choose] generationStatus not COMPLETED orderId=${orderId} status=${order.generationStatus}`);
    return NextResponse.json({ error: "Geração não concluída" }, { status: 409 });
  }

  const previewIds = order.images.map((i) => i.id);
  if (!previewIds.includes(imageId)) {
    console.error(`[choose] imageId not found in order orderId=${orderId} imageId=${imageId} available=${previewIds.join(",")}`);
    return NextResponse.json({ error: "Imagem não pertence a este pedido" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.generatedImage.updateMany({
      where: { orderId },
      data: { isChosen: false },
    }),
    prisma.generatedImage.update({
      where: { id: imageId },
      data: { isChosen: true },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: { imageId },
    }),
  ]);

  console.log(`[choose] done orderId=${orderId} chosenImageId=${imageId}`);
  return NextResponse.json({ ok: true });
}
