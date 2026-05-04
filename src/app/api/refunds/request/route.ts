import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  orderId: z.string().min(1),
  reason: z.string().min(10, "Descreva o motivo com pelo menos 10 caracteres"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { orderId, reason } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      paymentStatus: true,
      generationStatus: true,
      refundStatus: true,
    },
  });

  // Ownership check — não revela se o pedido existe mas pertence a outro usuário
  if (!order || order.userId !== session.user.id) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  if (order.refundStatus !== "NONE") {
    return NextResponse.json(
      { error: "Já existe uma solicitação de reembolso para este pedido" },
      { status: 409 }
    );
  }

  if (order.paymentStatus !== "PAID") {
    return NextResponse.json(
      { error: "Reembolso disponível apenas para pedidos pagos" },
      { status: 400 }
    );
  }

  // Geração não iniciada ou falhou → elegível automaticamente
  // Geração em progresso ou concluída → análise manual
  const isEligible =
    order.generationStatus === "PENDING" || order.generationStatus === "FAILED";

  const newRefundStatus = isEligible ? "ELIGIBLE" : "MANUAL_REVIEW";

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      refundStatus: newRefundStatus,
      refundReason: reason,
      refundRequestedAt: new Date(),
    },
    select: {
      id: true,
      refundStatus: true,
      refundRequestedAt: true,
    },
  });

  const message =
    newRefundStatus === "ELIGIBLE"
      ? "Reembolso elegível. Nossa equipe irá processá-lo em breve."
      : "Solicitação recebida. Como a imagem já foi gerada, passará por análise manual.";

  return NextResponse.json({
    message,
    refundStatus: updated.refundStatus,
    requestedAt: updated.refundRequestedAt,
  });
}
