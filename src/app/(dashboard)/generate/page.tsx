import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GenerateClient } from "./GenerateClient";

export default async function GeneratePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { credits: true, freeTrialUsed: true },
  });

  return (
    <GenerateClient
      initialCredits={user?.credits ?? 0}
      freeTrialUsed={user?.freeTrialUsed ?? false}
    />
  );
}
