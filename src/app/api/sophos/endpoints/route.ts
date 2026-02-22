import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSophosEndpoints } from "@/lib/sophos";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    const pageSize = searchParams.get("pageSize");
    const page = searchParams.get("page");
    const healthStatus = searchParams.get("healthStatus");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const tamperProtectionEnabled = searchParams.get(
      "tamperProtectionEnabled",
    );
    const isolationStatus = searchParams.get("isolationStatus");

    const data = await getSophosEndpoints(tenantId, {
      pageSize: pageSize ? Number(pageSize) : undefined,
      page: page ? Number(page) : undefined,
      healthStatus: healthStatus ?? undefined,
      type: type ?? undefined,
      search: search ?? undefined,
      tamperProtectionEnabled:
        tamperProtectionEnabled != null
          ? tamperProtectionEnabled === "true"
          : undefined,
      isolationStatus: isolationStatus ?? undefined,
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to fetch Sophos endpoints",
      },
      { status: 500 },
    );
  }
}
