import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DevRefundsClient, type OrderRow, type AdminOrderRow } from "./DevRefundsClient";

export default async function DevRefundsTestPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id, name, email, role } = session.user;

  const rawOrders = await prisma.order.findMany({
    where: { userId: id },
    select: {
      id: true,
      amount: true,
      paymentMethod: true,
      paymentStatus: true,
      generationStatus: true,
      refundStatus: true,
      disputeStatus: true,
      isFlagged: true,
      refundReason: true,
      refundRequestedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const orders: OrderRow[] = rawOrders.map((o) => ({
    id: o.id,
    amount: o.amount,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    generationStatus: o.generationStatus,
    refundStatus: o.refundStatus,
    disputeStatus: o.disputeStatus,
    isFlagged: o.isFlagged,
    refundReason: o.refundReason,
    refundRequestedAt: o.refundRequestedAt?.toISOString() ?? null,
    createdAt: o.createdAt.toISOString(),
  }));

  let adminOrders: AdminOrderRow[] | null = null;

  if (role === "ADMIN") {
    const rawAdmin = await prisma.order.findMany({
      where: {
        refundStatus: { in: ["ELIGIBLE", "MANUAL_REVIEW", "APPROVED"] },
      },
      select: {
        id: true,
        amount: true,
        paymentStatus: true,
        generationStatus: true,
        refundStatus: true,
        refundReason: true,
        disputeStatus: true,
        refundRequestedAt: true,
        user: { select: { email: true, name: true } },
      },
      orderBy: { refundRequestedAt: "asc" },
    });

    adminOrders = rawAdmin.map((o) => ({
      id: o.id,
      amount: o.amount,
      paymentStatus: o.paymentStatus,
      generationStatus: o.generationStatus,
      refundStatus: o.refundStatus,
      refundReason: o.refundReason,
      disputeStatus: o.disputeStatus,
      refundRequestedAt: o.refundRequestedAt?.toISOString() ?? null,
      user: o.user,
    }));
  }

  return (
    <DevRefundsClient
      currentUser={{ id, name: name ?? null, email: email ?? "", role: role ?? "USER" }}
      initialOrders={orders}
      initialAdminOrders={adminOrders}
    />
  );
}
