import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.plan = (user as { plan?: string }).plan ?? "FREE";
        token.credits = (user as { credits?: number }).credits ?? 3;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.plan = (token.plan as string) ?? "FREE";
      session.user.credits = (token.credits as number) ?? 3;
      return session;
    },
  },
});
