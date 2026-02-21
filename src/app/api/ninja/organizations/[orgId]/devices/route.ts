import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getNinjaOrgDevices } from "@/lib/ninja";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId: raw } = await params;
  const orgId = Number(raw);
  if (isNaN(orgId)) {
    return NextResponse.json({ error: "Invalid organization ID" }, { status: 400 });
  }

  const searchParams = request.nextUrl.searchParams;
  const pageSize = searchParams.get("pageSize")
    ? Number(searchParams.get("pageSize"))
    : undefined;
  const after = searchParams.get("after")
    ? Number(searchParams.get("after"))
    : undefined;

  try {
    const devices = await getNinjaOrgDevices(orgId, pageSize, after);
    return NextResponse.json(devices);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to fetch organization devices";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
