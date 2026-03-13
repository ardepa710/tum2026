import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActor, logAudit } from "@/lib/audit";
import { getSessionRole, hasMinRole } from "@/lib/rbac";
import {
  getSophosEndpointTamper,
  setSophosEndpointTamper,
} from "@/lib/sophos";
import { requireTenantAccess } from "@/lib/tenant-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ endpointId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const denyGet = await requireTenantAccess(tenantId);
  if (denyGet) return denyGet;

  try {
    const data = await getSophosEndpointTamper(tenantId, endpointId);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to fetch tamper protection status",
      },
      { status: 500 },
    );
  }
}

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

  const denyPost = await requireTenantAccess(tenantId);
  if (denyPost) return denyPost;

  try {
    const body = await request.json();
    const enabled: boolean = body.enabled;

    const data = await setSophosEndpointTamper(tenantId, endpointId, enabled);

    const actor = await getActor();
    logAudit({
      actor,
      action: "SOPHOS_TAMPER_TOGGLE",
      entity: "SOPHOS_ENDPOINT",
      entityId: endpointId,
      details: { tenantId, enabled },
    });

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to set tamper protection",
      },
      { status: 500 },
    );
  }
}
