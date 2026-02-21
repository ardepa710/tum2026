import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

  const upn = request.nextUrl.searchParams.get("upn");
  if (!upn) {
    return NextResponse.json(
      { error: "Missing upn query parameter" },
      { status: 400 },
    );
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { ninjaOrgId: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const assignments = await prisma.deviceAssignment.findMany({
      where: { tenantId, adUserUpn: upn },
      select: {
        id: true,
        ninjaDeviceId: true,
        ninjaDeviceName: true,
        assignedAt: true,
        assignedBy: true,
      },
      orderBy: { assignedAt: "desc" },
    });

    return NextResponse.json({
      ninjaOrgId: tenant.ninjaOrgId ?? null,
      assignments: assignments.map((a) => ({
        ...a,
        assignedAt: a.assignedAt.toISOString(),
      })),
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to fetch device assignments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
