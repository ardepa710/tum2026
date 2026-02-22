import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActor, logAudit } from "@/lib/audit";
import { getSessionRole, hasMinRole } from "@/lib/rbac";
import { startSophosScan } from "@/lib/sophos";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ endpointId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getSessionRole();
  if (!hasMinRole(role, "EDITOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { endpointId } = await params;

  const { searchParams } = new URL(request.url);
  const tenantIdRaw = searchParams.get("tenantId");
  if (!tenantIdRaw) {
    return NextResponse.json(
      { error: "tenantId query param is required" },
      { status: 400 },
    );
  }
  const tenantId = Number(tenantIdRaw);
  if (isNaN(tenantId)) {
    return NextResponse.json(
      { error: "Invalid tenantId" },
      { status: 400 },
    );
  }

  try {
    await startSophosScan(tenantId, endpointId);

    const actor = await getActor();
    logAudit({
      actor,
      action: "SOPHOS_SCAN",
      entity: "SOPHOS_ENDPOINT",
      entityId: endpointId,
      details: { tenantId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to start scan",
      },
      { status: 500 },
    );
  }
}
