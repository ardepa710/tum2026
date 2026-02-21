import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getNinjaDeviceAlerts } from "@/lib/ninja";

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
    const alerts = await getNinjaDeviceAlerts(deviceId);
    return NextResponse.json(alerts);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to fetch device alerts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
