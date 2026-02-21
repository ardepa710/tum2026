import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getNinjaDeviceProcessors,
  getNinjaDeviceVolumes,
  getNinjaDeviceDisks,
  getNinjaDeviceNetInterfaces,
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

  try {
    const [processorsResult, volumesResult, disksResult, netInterfacesResult] =
      await Promise.allSettled([
        getNinjaDeviceProcessors(deviceId),
        getNinjaDeviceVolumes(deviceId),
        getNinjaDeviceDisks(deviceId),
        getNinjaDeviceNetInterfaces(deviceId),
      ]);

    return NextResponse.json({
      processors:
        processorsResult.status === "fulfilled"
          ? processorsResult.value
          : [],
      volumes:
        volumesResult.status === "fulfilled" ? volumesResult.value : [],
      disks:
        disksResult.status === "fulfilled" ? disksResult.value : [],
      networkInterfaces:
        netInterfacesResult.status === "fulfilled"
          ? netInterfacesResult.value
          : [],
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to fetch device hardware";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
