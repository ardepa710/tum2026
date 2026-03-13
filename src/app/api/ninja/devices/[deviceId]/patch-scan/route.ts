import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasMinRole, type Role } from "@/lib/rbac-shared";
import { getActor, logAudit } from "@/lib/audit";
import { scanOsPatches, scanSoftwarePatches } from "@/lib/ninja";
import { getTenantIdForNinjaDevice, requireTenantAccess } from "@/lib/tenant-auth";

export async function POST(
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
  const deny = await requireTenantAccess(tenantId);
  if (deny) return deny;

  try {
    const body = await request.json();
    const type = body.type || "both";
    if (!["os", "software", "both"].includes(type)) {
      return NextResponse.json({ error: "Invalid type. Must be os, software, or both" }, { status: 400 });
    }

    if (type === "os") {
      await scanOsPatches(deviceId);
    } else if (type === "software") {
      await scanSoftwarePatches(deviceId);
    } else {
      await Promise.all([scanOsPatches(deviceId), scanSoftwarePatches(deviceId)]);
    }

    const actor = await getActor();
    logAudit({
      actor,
      action: "DEVICE_PATCH_SCAN",
      entity: "Device",
      entityId: deviceId,
      details: { type },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Patch scan failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
