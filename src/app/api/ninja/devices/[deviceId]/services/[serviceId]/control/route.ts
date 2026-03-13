import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasMinRole, type Role } from "@/lib/rbac-shared";
import { getActor, logAudit } from "@/lib/audit";
import { controlWindowsService } from "@/lib/ninja";
import { getTenantIdForNinjaDevice, requireTenantAccess } from "@/lib/tenant-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string; serviceId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = ((session.user as Record<string, unknown>).role as Role) ?? "VIEWER";
  if (!hasMinRole(role, "EDITOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { deviceId: rawDeviceId, serviceId } = await params;
  const deviceId = Number(rawDeviceId);
  if (isNaN(deviceId)) {
    return NextResponse.json({ error: "Invalid device ID" }, { status: 400 });
  }
  if (!serviceId) {
    return NextResponse.json({ error: "Invalid service ID" }, { status: 400 });
  }

  const tenantId = await getTenantIdForNinjaDevice(deviceId);
  if (tenantId === null) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }
  const deny = await requireTenantAccess(tenantId);
  if (deny) return deny;

  try {
    const body = await request.json();
    const action: "START" | "PAUSE" | "STOP" | "RESTART" = body.action;
    if (!["START", "PAUSE", "STOP", "RESTART"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await controlWindowsService(deviceId, serviceId, action);

    const actor = await getActor();
    logAudit({
      actor,
      action: "DEVICE_SERVICE_CONTROL",
      entity: "Device",
      entityId: deviceId,
      details: { serviceId, action },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Service control failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
