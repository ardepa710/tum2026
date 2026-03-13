/**
 * Edge-safe NextAuth configuration — no Prisma imports.
 *
 * Used by:
 *   - middleware.ts (Edge runtime, validates JWT + enforces role-based page access)
 *   - auth.ts (full Node runtime, spreads this and adds adapter/events/full jwt callback)
 *
 * The `session` callback here is the canonical implementation shared by both contexts.
 * The `jwt` callback here is a no-op passthrough; auth.ts overrides it with the full
 * syncTechPermissions logic that runs once at sign-in.
 */
import type { NextAuthConfig } from "next-auth";
import MicrosoftEntraId from "next-auth/providers/microsoft-entra-id";

export const authConfig: NextAuthConfig = {
  providers: [
    MicrosoftEntraId({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID}/v2.0`,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    // Passthrough — jwt callback in auth.ts handles syncTechPermissions on sign-in.
    // In middleware, `user` is never set (no new sign-in), so this is a no-op.
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    // Canonical session shape: copies id + role from JWT to session.user.
    session({ session, token }) {
      if (session.user) {
        (session.user as unknown as Record<string, unknown>).id = token.id as string | undefined;
        (session.user as unknown as Record<string, unknown>).role = token.role ?? "VIEWER";
      }
      return session;
    },
  },
};
