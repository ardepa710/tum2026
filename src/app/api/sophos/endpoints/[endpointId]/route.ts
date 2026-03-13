import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSophosEndpoint } from "@/lib/sophos";
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

  const deny = await requireTenantAccess(tenantId);
  if (deny) return deny;

  try {
    const data = await getSophosEndpoint(tenantId, endpointId);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to fetch Sophos endpoint",
      },
      { status: 500 },
    );
  }
}
