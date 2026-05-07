import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NavBar } from "./_components/NavBar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  let credits = 0;
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true },
    });
    credits = user?.credits ?? 0;
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <NavBar credits={credits} />
      <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
