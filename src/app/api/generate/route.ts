import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateProductImage } from "@/services/image.service";
import { getGenerationQualities } from "@/config/image-generation";

const isDev = process.env.NODE_ENV !== "production";

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
      originalImageKey: true,
    },
  });

  if (!order || order.userId !== session.user.id) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  if (order.paymentStatus !== "PAID") {
    return NextResponse.json({ error: "Pagamento não confirmado" }, { status: 402 });
  }

  if (order.generationStatus === "COMPLETED") {
    return NextResponse.json({ error: "Imagem já gerada para este pedido" }, { status: 409 });
  }

  if (order.generationStatus === "PROCESSING") {
    return NextResponse.json({ error: "Geração já em andamento" }, { status: 409 });
  }

  // Allow retry from FAILED; block only COMPLETED and PROCESSING
  if (order.generationStatus !== "PENDING" && order.generationStatus !== "FAILED") {
    return NextResponse.json({ error: "Status de geração inválido" }, { status: 409 });
  }

  if (!order.prompt) {
    return NextResponse.json({ error: "Prompt não encontrado no pedido" }, { status: 400 });
  }

  // Atomic check-and-set: only one concurrent request will succeed
  const claimed = await prisma.order.updateMany({
    where: { id: orderId, generationStatus: { in: ["PENDING", "FAILED"] } },
    data: { generationStatus: "PROCESSING" },
  });

  if (claimed.count === 0) {
    return NextResponse.json({ error: "Geração já em andamento ou concluída" }, { status: 409 });
  }

  try {
    const { previews } = await generateProductImage(
      order.prompt,
      session.user.id,
      orderId,
      order.originalImageKey ?? undefined,
      getGenerationQualities("single"),
    );

    // Rename presignedUrl → imageUrl to match the Preview interface in PayClient
    return NextResponse.json({
      previews: previews.map((p) => ({ imageUrl: p.presignedUrl, imageId: p.imageId })),
    });
  } catch (err) {
    if (isDev) console.error("[generate] generation failed:", err);

    await prisma.order.update({
      where: { id: orderId },
      data: { generationStatus: "FAILED" },
    });

    return NextResponse.json({ error: "Erro ao gerar imagem. Tente novamente." }, { status: 500 });
  }
}
