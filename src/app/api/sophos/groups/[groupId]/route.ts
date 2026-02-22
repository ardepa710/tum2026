import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSophosGroupDetail } from "@/lib/sophos";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const tenantIdRaw = url.searchParams.get("tenantId");
  if (!tenantIdRaw) {
    return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
  }
  const tenantId = Number(tenantIdRaw);
  if (isNaN(tenantId)) {
    return NextResponse.json({ error: "Invalid tenantId" }, { status: 400 });
  }

  const { groupId } = await params;

  try {
    const group = await getSophosGroupDetail(tenantId, groupId);
    return NextResponse.json(group);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to fetch Sophos group detail";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
