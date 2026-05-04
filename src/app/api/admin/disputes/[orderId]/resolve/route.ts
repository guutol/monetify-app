import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  resolution: z.enum(["WON", "LOST"]),
  adminNotes: z.string().optional(),
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

  const { resolution, adminNotes } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, disputeStatus: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  if (order.disputeStatus !== "OPEN") {
    return NextResponse.json(
      { error: "Nenhuma disputa aberta para este pedido" },
      { status: 409 }
    );
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      disputeStatus: resolution,
      ...(adminNotes ? { adminNotes } : {}),
    },
  });

  // Nota: AbacatePay não emite webhook para resolução de disputa (WON/LOST).
  // Esta atualização é sempre manual pelo admin após confirmação no dashboard/suporte.
  return NextResponse.json({
    message: `Disputa encerrada como ${resolution === "WON" ? "ganha (WON)" : "perdida (LOST)"}.`,
    disputeStatus: resolution,
  });
}
