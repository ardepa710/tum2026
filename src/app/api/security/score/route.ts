import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateSecurityScore } from "@/lib/security-score";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantIdParam = req.nextUrl.searchParams.get("tenantId");

  if (tenantIdParam) {
    const tenantId = Number(tenantIdParam);
    if (isNaN(tenantId))
      return NextResponse.json({ error: "Invalid tenantId" }, { status: 400 });

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, tenantAbbrv: true },
    });
    if (!tenant)
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const result = await calculateSecurityScore(tenant.id, tenant.tenantAbbrv);
    return NextResponse.json(result);
  }

  // All tenants
  const tenants = await prisma.tenant.findMany({
    select: { id: true, tenantAbbrv: true },
    orderBy: { tenantAbbrv: "asc" },
  });

  const results = await Promise.allSettled(
    tenants.map((t) => calculateSecurityScore(t.id, t.tenantAbbrv)),
  );

  const scores = results
    .filter(
      (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof calculateSecurityScore>>> =>
        r.status === "fulfilled",
    )
    .map((r) => r.value);

  return NextResponse.json(scores);
}
