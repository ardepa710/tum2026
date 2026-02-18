import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export type Role = "ADMIN" | "EDITOR" | "VIEWER";

const ROLE_LEVEL: Record<Role, number> = {
  ADMIN: 3,
  EDITOR: 2,
  VIEWER: 1,
};

// Pages hidden per role — minimum role required
const PAGE_ACCESS: Record<string, Role> = {
  "/dashboard/permissions": "ADMIN",
  "/dashboard/technicians": "ADMIN",
  "/dashboard/logs": "EDITOR",
};

export async function getSessionRole(): Promise<Role> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return ((session.user as Record<string, unknown>).role as Role) || "VIEWER";
}

export function hasMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[minRole];
}

export async function requireRole(minRole: Role): Promise<Role> {
  const role = await getSessionRole();
  if (!hasMinRole(role, minRole)) {
    redirect("/dashboard");
  }
  return role;
}

export function canAccessPage(role: Role, pathname: string): boolean {
  for (const [page, minRole] of Object.entries(PAGE_ACCESS)) {
    if (pathname.startsWith(page) && !hasMinRole(role, minRole)) {
      return false;
    }
  }
  return true;
}
