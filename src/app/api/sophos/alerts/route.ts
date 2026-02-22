import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSophosAlerts } from "@/lib/sophos";

export async function GET(request: NextRequest) {
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

  const pageSize = url.searchParams.get("pageSize")
    ? Number(url.searchParams.get("pageSize"))
    : undefined;
  const page = url.searchParams.get("page")
    ? Number(url.searchParams.get("page"))
    : undefined;
  const severity = url.searchParams.get("severity") || undefined;

  try {
    const alerts = await getSophosAlerts(tenantId, { pageSize, page, severity });
    return NextResponse.json(alerts);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to fetch Sophos alerts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
