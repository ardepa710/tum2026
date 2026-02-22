import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSophosGroupEndpoints } from "@/lib/sophos";

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

  const pageSize = url.searchParams.get("pageSize")
    ? Number(url.searchParams.get("pageSize"))
    : undefined;
  const page = url.searchParams.get("page")
    ? Number(url.searchParams.get("page"))
    : undefined;

  try {
    const endpoints = await getSophosGroupEndpoints(tenantId, groupId, {
      pageSize,
      page,
    });
    return NextResponse.json(endpoints);
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Failed to fetch Sophos group endpoints";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
