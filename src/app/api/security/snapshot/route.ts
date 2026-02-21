import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateSecurityScore, clearScoreCache } from "@/lib/security-score";
import { logAudit, getActor } from "@/lib/audit";
import { broadcastEvent } from "@/lib/sse";

// POST — Capture a new security snapshot (ADMIN only)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check admin role
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { tenantId } = await req.json();
  if (!tenantId || isNaN(Number(tenantId))) {
    return NextResponse.json({ error: "Invalid tenantId" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: Number(tenantId) },
    select: { id: true, tenantAbbrv: true },
  });
  if (!tenant)
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  clearScoreCache(tenant.id);
  const scoreResult = await calculateSecurityScore(
    tenant.id,
    tenant.tenantAbbrv,
  );

  const snapshot = await prisma.securitySnapshot.create({
    data: {
      tenantId: tenant.id,
      score: scoreResult.totalScore,
      checksJson: JSON.stringify(scoreResult.checks),
    },
  });

  const actor = await getActor();
  logAudit({
    actor,
    action: "CAPTURE",
    entity: "SECURITY_SNAPSHOT",
    entityId: snapshot.id,
    details: { tenantId: tenant.id, score: scoreResult.totalScore },
  });

  broadcastEvent("security-snapshot", { tenantId: tenant.id, score: scoreResult.totalScore });

  return NextResponse.json({
    id: snapshot.id,
    score: snapshot.score,
    capturedAt: snapshot.capturedAt.toISOString(),
  });
}

// GET — Snapshot history for a tenant
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantIdParam = req.nextUrl.searchParams.get("tenantId");
  if (!tenantIdParam) return NextResponse.json([]);

  const tenantId = Number(tenantIdParam);
  if (isNaN(tenantId))
    return NextResponse.json({ error: "Invalid tenantId" }, { status: 400 });

  const daysParam = Number(req.nextUrl.searchParams.get("days")) || 30;
  const days = Math.min(Math.max(daysParam, 1), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const snapshots = await prisma.securitySnapshot.findMany({
    where: {
      tenantId,
      capturedAt: { gte: since },
    },
    orderBy: { capturedAt: "asc" },
    select: { id: true, score: true, capturedAt: true },
  });

  return NextResponse.json(
    snapshots.map((s) => ({
      id: s.id,
      score: s.score,
      capturedAt: s.capturedAt.toISOString(),
    })),
  );
}
