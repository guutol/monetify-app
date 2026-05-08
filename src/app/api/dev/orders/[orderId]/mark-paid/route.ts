import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const TERMINAL_STATUSES = new Set(["EXPIRED", "CANCELLED", "FAILED", "REFUNDED"]);

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, paymentStatus: true },
  });

  if (!order || order.userId !== session.user.id) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  if (order.paymentStatus === "PAID") {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }

  if (TERMINAL_STATUSES.has(order.paymentStatus)) {
    return NextResponse.json(
      { error: `Pedido em status ${order.paymentStatus} não pode ser marcado como pago` },
      { status: 409 }
    );
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: "PAID" },
  });

  return NextResponse.json({ ok: true });
}
