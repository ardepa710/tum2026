import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActor, logAudit } from "@/lib/audit";
import { setDeviceMaintenance, cancelDeviceMaintenance } from "@/lib/ninja";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as Record<string, unknown>).role as string;
  if (role !== "ADMIN" && role !== "EDITOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { deviceId: raw } = await params;
  const deviceId = Number(raw);
  if (isNaN(deviceId)) {
    return NextResponse.json({ error: "Invalid device ID" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const endTime: number = body.endTime;
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

  const role = (session.user as Record<string, unknown>).role as string;
  if (role !== "ADMIN" && role !== "EDITOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { deviceId: raw } = await params;
  const deviceId = Number(raw);
  if (isNaN(deviceId)) {
    return NextResponse.json({ error: "Invalid device ID" }, { status: 400 });
  }

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
