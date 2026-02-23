import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNinjaOrgDevices } from "@/lib/ninja";
import { getSophosEndpoints } from "@/lib/sophos";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const tenantIdRaw = searchParams.get("tenantId");
  const side = searchParams.get("side"); // "sophos" | "ninja"

  if (!tenantIdRaw || !side) {
    return NextResponse.json(
      { error: "tenantId and side query parameters are required" },
      { status: 400 },
    );
  }

  const tenantId = Number(tenantIdRaw);
  if (isNaN(tenantId)) {
    return NextResponse.json({ error: "Invalid tenantId" }, { status: 400 });
  }

  if (side !== "sophos" && side !== "ninja") {
    return NextResponse.json(
      { error: "side must be 'sophos' or 'ninja'" },
      { status: 400 },
    );
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { ninjaOrgId: true, sophosOrgId: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Fetch existing cross-links to exclude already-linked items
    const existingLinks = await prisma.deviceCrossLink.findMany({
      where: { tenantId },
      select: { ninjaDeviceId: true, sophosEndpointId: true },
    });

    if (side === "sophos") {
      // Return available Sophos endpoints (not already linked)
      if (!tenant.sophosOrgId) {
        return NextResponse.json({ candidates: [] });
      }

      const linkedSophosIds = new Set(
        existingLinks.map((l) => l.sophosEndpointId),
      );

      const response = await getSophosEndpoints(tenantId, { pageSize: 500 });
      const candidates = response.items
        .filter((e) => !linkedSophosIds.has(e.id))
        .map((e) => ({ id: e.id, name: e.hostname }));

      return NextResponse.json({ candidates });
    } else {
      // Return available NinjaOne devices (not already linked)
      if (!tenant.ninjaOrgId) {
        return NextResponse.json({ candidates: [] });
      }

      const linkedNinjaIds = new Set(
        existingLinks.map((l) => l.ninjaDeviceId),
      );

      const devices = await getNinjaOrgDevices(tenant.ninjaOrgId);
      const candidates = devices
        .filter((d) => !linkedNinjaIds.has(d.id))
        .map((d) => ({
          id: d.id,
          name: d.systemName || d.displayName || `Device ${d.id}`,
        }));

      return NextResponse.json({ candidates });
    }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to fetch candidates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
