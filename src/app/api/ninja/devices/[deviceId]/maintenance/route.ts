import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasMinRole, type Role } from "@/lib/rbac-shared";
import { getActor, logAudit } from "@/lib/audit";
import { setDeviceMaintenance, cancelDeviceMaintenance } from "@/lib/ninja";
import { getTenantIdForNinjaDevice, requireTenantAccess } from "@/lib/tenant-auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = ((session.user as Record<string, unknown>).role as Role) ?? "VIEWER";
  if (!hasMinRole(role, "EDITOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { deviceId: raw } = await params;
  const deviceId = Number(raw);
  if (isNaN(deviceId)) {
    return NextResponse.json({ error: "Invalid device ID" }, { status: 400 });
  }

  const tenantId = await getTenantIdForNinjaDevice(deviceId);
  if (tenantId === null) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }
  const denyPut = await requireTenantAccess(tenantId);
  if (denyPut) return denyPut;

  try {
    const body = await request.json();
    const endTime = Number(body.endTime);
    if (isNaN(endTime) || endTime <= Date.now()) {
      return NextResponse.json({ error: "Invalid or past endTime" }, { status: 400 });
    }
    const reason: string | undefined = body.reason || undefined;
    const disabledFeatures: string[] | undefined = body.disabledFeatures || undefined;

    await setDeviceMaintenance(deviceId, endTime, reason, disabledFeatures);

    const actor = await getActor();
    logAudit({
      actor,
      action: "DEVICE_MAINTENANCE_SET",
      entity: "Device",
      entityId: deviceId,
      details: { endTime, reason },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Set maintenance failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = ((session.user as Record<string, unknown>).role as Role) ?? "VIEWER";
  if (!hasMinRole(role, "EDITOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { deviceId: raw } = await params;
  const deviceId = Number(raw);
  if (isNaN(deviceId)) {
    return NextResponse.json({ error: "Invalid device ID" }, { status: 400 });
  }

  const tenantId = await getTenantIdForNinjaDevice(deviceId);
  if (tenantId === null) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }
  const denyDelete = await requireTenantAccess(tenantId);
  if (denyDelete) return denyDelete;

  try {
    await cancelDeviceMaintenance(deviceId);

    const actor = await getActor();
    logAudit({
      actor,
      action: "DEVICE_MAINTENANCE_CANCEL",
      entity: "Device",
      entityId: deviceId,
      details: {},
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Cancel maintenance failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
