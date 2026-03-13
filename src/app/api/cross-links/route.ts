import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireTenantAccess } from "@/lib/tenant-auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantIdRaw = request.nextUrl.searchParams.get("tenantId");
  if (!tenantIdRaw) {
    return NextResponse.json(
      { error: "tenantId query parameter is required" },
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
    const crossLinks = await prisma.deviceCrossLink.findMany({
      where: { tenantId },
      orderBy: { linkedAt: "desc" },
    });
    return NextResponse.json(crossLinks);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to fetch cross-links";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    tenantId: number;
    ninjaDeviceId: number;
    ninjaDeviceName: string;
    sophosEndpointId: string;
    sophosEndpointName: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { tenantId, ninjaDeviceId, ninjaDeviceName, sophosEndpointId, sophosEndpointName } = body;

  if (!tenantId || !ninjaDeviceId || !ninjaDeviceName || !sophosEndpointId || !sophosEndpointName) {
    return NextResponse.json(
      { error: "Missing required fields: tenantId, ninjaDeviceId, ninjaDeviceName, sophosEndpointId, sophosEndpointName" },
      { status: 400 },
    );
  }

  const denyPost = await requireTenantAccess(tenantId);
  if (denyPost) return denyPost;

  try {
    const crossLink = await prisma.deviceCrossLink.create({
      data: {
        tenantId,
        ninjaDeviceId,
        ninjaDeviceName,
        sophosEndpointId,
        sophosEndpointName,
        linkedBy: session.user.email || "unknown",
      },
    });
    return NextResponse.json(crossLink, { status: 201 });
  } catch (e) {
    // Check for unique constraint violation (Prisma P2002)
    if (
      e instanceof Error &&
      "code" in e &&
      (e as unknown as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A cross-link already exists for this device or endpoint in this tenant" },
        { status: 409 },
      );
    }
    const message =
      e instanceof Error ? e.message : "Failed to create cross-link";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
