import NextAuth from "next-auth";
import MicrosoftEntraId from "next-auth/providers/microsoft-entra-id";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { Role } from "@/lib/rbac-shared";

/**
 * Sync permissions from tbmtechpermissions → tbmuser_permissions on login.
 * If the user's email exists in tbmtechpermissions, their UserPermission records
 * are replaced with the tech permissions, and their role is set to ADMIN.
 * Returns the resolved role.
 */
async function syncTechPermissions(userId: string, email: string): Promise<Role> {
  const techPerms = await prisma.techPermission.findMany({
    where: { techEmail: email },
    select: { permissionId: true },
  });

  if (techPerms.length === 0) {
    // Not a recognized technician — keep current DB role
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return (dbUser?.role as Role) || "VIEWER";
  }

  const permissionIds = techPerms.map((tp) => tp.permissionId);

  // Replace all UserPermission records in a transaction
  await prisma.$transaction([
    // Remove permissions no longer in tech table
    prisma.userPermission.deleteMany({
      where: { userId, permissionId: { notIn: permissionIds } },
    }),
    // Upsert each permission from tech table
    ...permissionIds.map((permissionId) =>
      prisma.userPermission.upsert({
        where: { userId_permissionId: { userId, permissionId } },
        create: { userId, permissionId },
        update: {},
      })
    ),
    // Promote to ADMIN since they're a recognized technician
    prisma.user.update({
      where: { id: userId },
      data: { role: "ADMIN" },
    }),
  ]);

  return "ADMIN";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    MicrosoftEntraId({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID}/v2.0`,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  events: {
    async signIn({ user }) {
      logAudit({ actor: user.email ?? "unknown", action: "LOGIN", entity: "SESSION", entityId: user.id });
    },
    async signOut(message) {
      const email = "token" in message ? (message.token as Record<string, unknown>)?.email as string : "unknown";
      logAudit({ actor: email ?? "unknown", action: "LOGOUT", entity: "SESSION" });
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        try {
          token.role = await syncTechPermissions(user.id!, user.email!);
        } catch {
          token.role = "VIEWER";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        (session.user as unknown as Record<string, unknown>).role = token.role || "VIEWER";
      }
      return session;
    },
  },
});
