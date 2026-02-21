import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getNinjaOrgDetail } from "@/lib/ninja";

export async function GET(
  _request: NextRequest,
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

  try {
    const org = await getNinjaOrgDetail(orgId);
    return NextResponse.json(org);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to fetch organization detail";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
