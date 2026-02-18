/**
 * Shared RBAC utilities that can be imported from both client and server components.
 * Does NOT import auth/prisma — safe for "use client" modules.
 */

export type Role = "ADMIN" | "EDITOR" | "VIEWER";

export const ROLE_LEVEL: Record<Role, number> = {
  ADMIN: 3,
  EDITOR: 2,
  VIEWER: 1,
};

// Pages hidden per role — minimum role required
export const PAGE_ACCESS: Record<string, Role> = {
  "/dashboard/permissions": "ADMIN",
  "/dashboard/technicians": "ADMIN",
  "/dashboard/logs": "EDITOR",
};

export function hasMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[minRole];
}

export function canAccessPage(role: Role, pathname: string): boolean {
  for (const [page, minRole] of Object.entries(PAGE_ACCESS)) {
    if (pathname.startsWith(page) && !hasMinRole(role, minRole)) {
      return false;
    }
  }
  return true;
}
