import NextAuth from "next-auth";
import MicrosoftEntraId from "next-auth/providers/microsoft-entra-id";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { Role } from "@/lib/rbac-shared";

/**
 * Map permission_code from tbmpermissions to the app's Role enum.
 * SUPERADMIN / ADMIN → ADMIN, everything else → VIEWER.
 * When a tech has multiple permissions, the highest role wins.
 */
const PERMISSION_ROLE_MAP: Record<string, Role> = {
  SUPERADMIN: "ADMIN",
  ADMIN: "ADMIN",
  TECH: "VIEWER",
};

/**
 * Sync permissions from tbmtechpermissions → tbmuser_permissions on login.
 * Derives the user's role from the highest permission_code they hold.
 */
async function syncTechPermissions(userId: string, email: string): Promise<Role> {
  const techPerms = await prisma.techPermission.findMany({
    where: { techEmail: email },
    select: { permissionId: true, permission: { select: { permissionCode: true } } },
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

  // Derive role from the highest permission code
  const ROLE_PRIORITY: Role[] = ["ADMIN", "EDITOR", "VIEWER"];
  const derivedRole = techPerms.reduce<Role>((best, tp) => {
    const mapped = PERMISSION_ROLE_MAP[tp.permission.permissionCode] || "VIEWER";
    return ROLE_PRIORITY.indexOf(mapped) < ROLE_PRIORITY.indexOf(best) ? mapped : best;
  }, "VIEWER");

  // Replace all UserPermission records in a transaction
  await prisma.$transaction([
    prisma.userPermission.deleteMany({
      where: { userId, permissionId: { notIn: permissionIds } },
    }),
    ...permissionIds.map((permissionId) =>
      prisma.userPermission.upsert({
        where: { userId_permissionId: { userId, permissionId } },
        create: { userId, permissionId },
        update: {},
      })
    ),
    prisma.user.update({
      where: { id: userId },
      data: { role: derivedRole },
    }),
  ]);

  return derivedRole;
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
    error: "/login",
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
