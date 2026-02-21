import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getNinjaDevices } from "@/lib/ninja";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const pageSize = searchParams.get("pageSize")
    ? Number(searchParams.get("pageSize"))
    : undefined;
  const after = searchParams.get("after")
    ? Number(searchParams.get("after"))
    : undefined;
  const df = searchParams.get("df") || undefined;

  try {
    const devices = await getNinjaDevices(pageSize, after, df);
    return NextResponse.json(devices);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to fetch devices";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
