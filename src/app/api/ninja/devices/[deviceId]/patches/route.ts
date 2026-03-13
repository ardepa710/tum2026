import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTenantIdForNinjaDevice, requireTenantAccess } from "@/lib/tenant-auth";
import {
  getNinjaDeviceOsPatches,
  getNinjaDeviceSoftwarePatches,
} from "@/lib/ninja";

export async function GET(
  _request: NextRequest,
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

  const tenantId = await getTenantIdForNinjaDevice(deviceId);
  if (tenantId === null) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }
  const deny = await requireTenantAccess(tenantId);
  if (deny) return deny;

  try {
    const [osPatchesResult, softwarePatchesResult] = await Promise.allSettled([
      getNinjaDeviceOsPatches(deviceId),
      getNinjaDeviceSoftwarePatches(deviceId),
    ]);

    return NextResponse.json({
      osPatches:
        osPatchesResult.status === "fulfilled" ? osPatchesResult.value : [],
      softwarePatches:
        softwarePatchesResult.status === "fulfilled"
          ? softwarePatchesResult.value
          : [],
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to fetch device patches";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
