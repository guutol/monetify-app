import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handlePackagePayment } from "@/lib/order-payment";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, orderType: true, planId: true, paymentStatus: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rawWebhookData = { source: "dev-simulate", simulatedAt: new Date().toISOString() };

  if (order.orderType === "PACKAGE") {
    const result = await handlePackagePayment(orderId, order.planId, order.userId, rawWebhookData);

    const creditTx = await prisma.creditTransaction.findFirst({
      where: { orderId, type: "PURCHASED" },
      select: { id: true },
    });

    return NextResponse.json({
      orderId,
      orderType: "PACKAGE",
      paymentStatus: "PAID",
      packageActivated: creditTx !== null,
      creditsAdded: result.creditsAdded,
      duplicate: result.alreadyCredited,
    });
  }

  // GENERATION order: just mark PAID
  const duplicate = order.paymentStatus === "PAID";
  if (!duplicate) {
    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: "PAID", rawWebhookData },
    });
  }

  return NextResponse.json({
    orderId,
    orderType: order.orderType,
    paymentStatus: "PAID",
    packageActivated: null,
    creditsAdded: 0,
    duplicate,
  });
}
