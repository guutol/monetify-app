import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected = ["/dashboard", "/generate", "/history", "/billing", "/pay"].some(
        (path) => nextUrl.pathname.startsWith(path)
      );
      if (isProtected && !isLoggedIn) return false;
      return true;
    },
  },
} satisfies NextAuthConfig;
