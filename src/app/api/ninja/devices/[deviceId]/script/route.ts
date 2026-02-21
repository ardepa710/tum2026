import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActor, logAudit } from "@/lib/audit";
import { runDeviceScript } from "@/lib/ninja";

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
    const scriptId: number = Number(body.scriptId);
    if (isNaN(scriptId)) {
      return NextResponse.json({ error: "Invalid script ID" }, { status: 400 });
    }
    const parameters: Record<string, string> | undefined = body.parameters || undefined;

    await runDeviceScript(deviceId, scriptId, parameters);

    const actor = await getActor();
    logAudit({
      actor,
      action: "DEVICE_SCRIPT_RUN",
      entity: "Device",
      entityId: deviceId,
      details: { scriptId },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Script execution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
