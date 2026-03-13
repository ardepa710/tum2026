/**
 * Tenant-level access control.
 *
 * ADMIN role → access to all tenants (no DB lookup needed).
 * EDITOR / VIEWER → only tenants explicitly assigned in tbmtech_tenants
 *   (TechTenantAssignment), matched by the logged-in user's email.
 *
 * Usage in an API route:
 *   const deny = await requireTenantAccess(tenantId);
 *   if (deny) return deny;
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

type UserSession = Session & { user: { role?: string; email?: string; id?: string } };

function isAdmin(session: UserSession): boolean {
  const role = (session.user as Record<string, unknown>).role as string | undefined;
  return role === "ADMIN";
}

/**
 * Returns the list of tenant IDs accessible to the currently logged-in user.
 * ADMIN → all tenant IDs (fetched from DB).
 * Others → only the tenants assigned to their email in TechTenantAssignment.
 *
 * Useful for filtering tenant lists in search, reports, analytics, etc.
 */
export async function getAccessibleTenantIds(): Promise<number[]> {
  const session = (await auth()) as UserSession | null;
  if (!session?.user?.email) return [];

  if (isAdmin(session)) {
    const tenants = await prisma.tenant.findMany({ select: { id: true } });
    return tenants.map((t) => t.id);
  }

  const assignments = await prisma.techTenantAssignment.findMany({
    where: { techEmail: session.user.email },
    select: { tenantId: true },
  });
  return assignments.map((a) => a.tenantId);
}

/**
 * Guards a route handler: verifies the current user has access to `tenantId`.
 *
 * Returns null if access is granted (proceed with the request).
 * Returns a NextResponse with 401 or 403 if access is denied (return it immediately).
 *
 * ADMIN role always passes. Non-admins must have a TechTenantAssignment row for
 * their email + tenantId combination.
 *
 * @example
 *   const deny = await requireTenantAccess(tenantId);
 *   if (deny) return deny;
 */
export async function requireTenantAccess(tenantId: number): Promise<NextResponse | null> {
  const session = (await auth()) as UserSession | null;

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isAdmin(session)) {
    return null; // ADMIN sees all tenants
  }

  const assignment = await prisma.techTenantAssignment.findUnique({
    where: {
      techEmail_tenantId: {
        techEmail: session.user.email,
        tenantId,
      },
    },
    select: { id: true },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null; // access granted
}
