import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateProductImage } from "@/services/image.service";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : null;

  if (!orderId) {
    return NextResponse.json({ error: "orderId obrigatório" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      paymentStatus: true,
      generationStatus: true,
      prompt: true,
    },
  });

  if (!order || order.userId !== session.user.id) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  if (order.paymentStatus !== "PAID") {
    return NextResponse.json({ error: "Pagamento não confirmado" }, { status: 402 });
  }

  if (order.generationStatus !== "PENDING") {
    return NextResponse.json({ error: "Geração já iniciada ou concluída" }, { status: 409 });
  }

  if (!order.prompt) {
    return NextResponse.json({ error: "Prompt não encontrado no pedido" }, { status: 400 });
  }

  // Mark as PROCESSING to prevent concurrent generation requests
  await prisma.order.update({
    where: { id: orderId },
    data: { generationStatus: "PROCESSING" },
  });

  try {
    const { presignedUrl, imageId } = await generateProductImage(
      order.prompt,
      session.user.id,
      orderId
    );

    return NextResponse.json({ imageUrl: presignedUrl, imageId });
  } catch (err) {
    await prisma.order.update({
      where: { id: orderId },
      data: { generationStatus: "FAILED" },
    });

    const message = err instanceof Error ? err.message : "Erro ao gerar imagem";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
