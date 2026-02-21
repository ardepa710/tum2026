import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActor, logAudit } from "@/lib/audit";
import { rebootDevice } from "@/lib/ninja";

export async function POST(
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
    const mode: "NORMAL" | "FORCED" = body.mode === "FORCED" ? "FORCED" : "NORMAL";
    const reason: string | undefined = body.reason || undefined;

    await rebootDevice(deviceId, mode, reason);

    const actor = await getActor();
    logAudit({
      actor,
      action: "DEVICE_REBOOT",
      entity: "Device",
      entityId: deviceId,
      details: { mode, reason },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Reboot failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
