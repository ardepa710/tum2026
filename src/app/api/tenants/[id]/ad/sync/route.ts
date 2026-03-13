import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fullSyncTenant } from "@/lib/ad-sync";
import { requireTenantAccess } from "@/lib/tenant-auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tenantId = Number(id);
  if (isNaN(tenantId)) {
    return NextResponse.json({ error: "Invalid tenant ID" }, { status: 400 });
  }

  const deny = await requireTenantAccess(tenantId);
  if (deny) return deny;

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  if (!tenant.adAgentId) {
    return NextResponse.json(
      { error: "No SentinelAgent configured for this tenant. Set adAgentId first." },
      { status: 422 }
    );
  }

  const result = await fullSyncTenant(tenantId, tenant.adAgentId);

  return NextResponse.json({
    ok: true,
    data: result,
    syncedAt: new Date().toISOString(),
  });
}

/** GET returns the last sync timestamp and record counts */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tenantId = Number(id);
  if (isNaN(tenantId)) {
    return NextResponse.json({ error: "Invalid tenant ID" }, { status: 400 });
  }

  const deny = await requireTenantAccess(tenantId);
  if (deny) return deny;

  const [tenant, userCount, groupCount] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { adAgentId: true, adLastSyncAt: true },
    }),
    prisma.adUser.count({ where: { tenantId } }),
    prisma.adGroup.count({ where: { tenantId } }),
  ]);

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json({
    agentConfigured: !!tenant.adAgentId,
    lastSyncAt: tenant.adLastSyncAt,
    userCount,
    groupCount,
  });
}
