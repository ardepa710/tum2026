import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { deviceId: raw } = await params;
  const deviceId = Number(raw);
  if (isNaN(deviceId)) {
    return NextResponse.json({ error: "Invalid device ID" }, { status: 400 });
  }

  const orgIdParam = request.nextUrl.searchParams.get("orgId");
  if (!orgIdParam) {
    return NextResponse.json(
      { error: "Missing orgId query parameter" },
      { status: 400 },
    );
  }
  const ninjaOrgId = Number(orgIdParam);
  if (isNaN(ninjaOrgId)) {
    return NextResponse.json(
      { error: "Invalid orgId query parameter" },
      { status: 400 },
    );
  }

  try {
    // Find tenant linked to this NinjaOne organization
    const tenant = await prisma.tenant.findFirst({
      where: { ninjaOrgId },
    });

    // Find existing assignment for this device
    const assignment = await prisma.deviceAssignment.findFirst({
      where: { ninjaDeviceId: deviceId },
    });

    return NextResponse.json({
      tenantId: tenant?.id ?? null,
      assignment: assignment
        ? {
            id: assignment.id,
            adUserUpn: assignment.adUserUpn,
            adUserName: assignment.adUserName,
            assignedAt: assignment.assignedAt.toISOString(),
            assignedBy: assignment.assignedBy,
          }
        : null,
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to fetch assignment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
