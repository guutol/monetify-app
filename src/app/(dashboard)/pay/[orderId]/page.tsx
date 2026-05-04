import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PayClient } from "./PayClient";

export default async function PayPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      amount: true,
      paymentStatus: true,
      generationStatus: true,
      pixBrCode: true,
      pixBrCodeBase64: true,
      pixExpiresAt: true,
      prompt: true,
    },
  });

  if (!order || order.userId !== session.user.id) {
    notFound();
  }

  return (
    <PayClient
      orderId={order.id}
      amount={order.amount}
      pixBrCode={order.pixBrCode ?? ""}
      pixBrCodeBase64={order.pixBrCodeBase64 ?? ""}
      pixExpiresAt={order.pixExpiresAt?.toISOString() ?? null}
      initialPaymentStatus={order.paymentStatus}
      initialGenerationStatus={order.generationStatus}
      isDevEnvironment={process.env.NODE_ENV === "development"}
    />
  );
}
