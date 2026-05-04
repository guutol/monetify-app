import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  decision: z.enum(["APPROVED", "DENIED"]),
  reason: z.string().min(10, "Descreva o motivo com pelo menos 10 caracteres"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { orderId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { decision, reason } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, refundStatus: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  const awaitingDecision: string[] = ["ELIGIBLE", "MANUAL_REVIEW", "REQUESTED"];
  if (!awaitingDecision.includes(order.refundStatus)) {
    return NextResponse.json(
      { error: "Este pedido não está aguardando decisão de reembolso" },
      { status: 409 }
    );
  }

  const newRefundStatus = decision === "APPROVED" ? "APPROVED" : "DENIED";

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { refundStatus: newRefundStatus },
    }),
    prisma.refundDecision.create({
      data: {
        orderId,
        adminId: session.user.id,
        decision,
        reason,
      },
    }),
  ]);

  const message =
    decision === "APPROVED"
      ? "Reembolso aprovado. Execute o reembolso financeiro manualmente no dashboard da AbacatePay. O sistema será atualizado automaticamente ao receber o webhook checkout.refunded."
      : "Reembolso negado. O registro foi salvo no histórico de decisões.";

  return NextResponse.json({ message, refundStatus: newRefundStatus });
}
