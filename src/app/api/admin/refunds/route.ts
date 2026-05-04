import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const orders = await prisma.order.findMany({
    where: {
      refundStatus: { in: ["ELIGIBLE", "MANUAL_REVIEW", "APPROVED"] },
    },
    select: {
      id: true,
      amount: true,
      paymentMethod: true,
      paymentStatus: true,
      generationStatus: true,
      refundStatus: true,
      refundReason: true,
      refundRequestedAt: true,
      isFlagged: true,
      adminNotes: true,
      createdAt: true,
      user: {
        select: { id: true, email: true, name: true },
      },
      refundDecisions: {
        select: {
          decision: true,
          reason: true,
          adminId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      // rawWebhookData excluído intencionalmente — só via acesso direto ao banco
    },
    orderBy: { refundRequestedAt: "asc" },
  });

  return NextResponse.json({ orders });
}
