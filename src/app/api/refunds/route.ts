import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: {
      userId: session.user.id,
      refundStatus: { not: "NONE" },
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
      refundedAt: true,
      disputeStatus: true,
      createdAt: true,
      // rawWebhookData excluído intencionalmente — não expor ao usuário
    },
    orderBy: { refundRequestedAt: "desc" },
  });

  return NextResponse.json({ orders });
}
