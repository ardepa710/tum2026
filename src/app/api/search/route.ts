import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUsers } from "@/lib/graph";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json([], { status: 401 });

  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase();
  if (!q || q.length < 2) return NextResponse.json([]);

  const tenants = await prisma.tenant.findMany({
    select: { id: true, tenantName: true, tenantAbbrv: true },
  });

  // Fetch users from all tenants in parallel
  const results = await Promise.allSettled(
    tenants.map(async (tenant) => {
      const users = await getUsers(tenant.id);
      return users
        .filter((u: any) => {
          const name = (u.displayName || "").toLowerCase();
          const email = (u.mail || u.userPrincipalName || "").toLowerCase();
          return name.includes(q) || email.includes(q);
        })
        .map((u: any) => ({
          tenantId: tenant.id,
          tenantName: tenant.tenantName,
          tenantAbbrv: tenant.tenantAbbrv,
          userId: u.id,
          displayName: u.displayName,
          email: u.mail || u.userPrincipalName,
        }));
    })
  );

  // Flatten results from fulfilled promises only
  const flat = results
    .filter((r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled")
    .flatMap((r) => r.value)
    .slice(0, 20);

  return NextResponse.json(flat);
}
