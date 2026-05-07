import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GenerateClient } from "./GenerateClient";

// /generate is public — no redirect for unauthenticated users.
// Actions (trial, checkout, with-credit) require login and are enforced
// client-side (redirect to /login) and server-side (401 on all API routes).
export default async function GeneratePage() {
  const session = await auth();

  let initialCredits = 0;
  let freeTrialUsed = false;

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true, freeTrialUsed: true },
    });
    initialCredits = user?.credits ?? 0;
    freeTrialUsed = user?.freeTrialUsed ?? false;
  }

  return (
    <GenerateClient
      initialCredits={initialCredits}
      freeTrialUsed={freeTrialUsed}
      isLoggedIn={!!session?.user?.id}
    />
  );
}
