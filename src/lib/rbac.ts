/**
 * Server-only RBAC utilities. Imports auth/prisma — NOT safe for "use client" modules.
 * For client-safe helpers, import from "@/lib/rbac-shared" instead.
 */
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

// Re-export shared types and pure functions so existing server-side imports still work
export { type Role, hasMinRole, canAccessPage } from "@/lib/rbac-shared";

import { type Role, hasMinRole } from "@/lib/rbac-shared";

export async function getSessionRole(): Promise<Role> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return ((session.user as Record<string, unknown>).role as Role) || "VIEWER";
}

export async function requireRole(minRole: Role): Promise<Role> {
  const role = await getSessionRole();
  if (!hasMinRole(role, minRole)) {
    redirect("/dashboard");
  }
  return role;
}
