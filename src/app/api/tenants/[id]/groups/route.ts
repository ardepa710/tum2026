import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGroups } from "@/lib/graph";
import { requireTenantAccess } from "@/lib/tenant-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tenantId = Number(id);
  if (isNaN(tenantId)) {
    return NextResponse.json({ error: "Invalid tenant ID" }, { status: 400 });
  }

  const deny = await requireTenantAccess(tenantId);
  if (deny) return deny;

  try {
    const groups = await getGroups(tenantId);
    return NextResponse.json(groups);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch groups";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
