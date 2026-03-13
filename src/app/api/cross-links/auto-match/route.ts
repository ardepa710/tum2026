import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNinjaOrgDevices } from "@/lib/ninja";
import { getSophosEndpoints } from "@/lib/sophos";
import type { SophosEndpoint } from "@/lib/types/sophos";
import { requireTenantAccess } from "@/lib/tenant-auth";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { tenantId: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { tenantId } = body;
  if (!tenantId) {
    return NextResponse.json(
      { error: "tenantId is required" },
      { status: 400 },
    );
  }

  const deny = await requireTenantAccess(tenantId);
  if (deny) return deny;

  // Fetch tenant to get both integration IDs
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, ninjaOrgId: true, sophosOrgId: true },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  if (!tenant.ninjaOrgId) {
    return NextResponse.json(
      { error: "Tenant is not linked to a NinjaOne organization" },
      { status: 400 },
    );
  }

  if (!tenant.sophosOrgId) {
    return NextResponse.json(
      { error: "Tenant is not linked to a Sophos organization" },
      { status: 400 },
    );
  }

  try {
    // Fetch NinjaOne devices
    const ninjaDevices = await getNinjaOrgDevices(tenant.ninjaOrgId);

    // Fetch all Sophos endpoints (paginate through all pages)
    const allSophosEndpoints: SophosEndpoint[] = [];
    let page = 1;
    const pageSize = 500;
    let hasMore = true;

    while (hasMore) {
      const response = await getSophosEndpoints(tenantId, { page, pageSize });
      allSophosEndpoints.push(...response.items);

      if (response.pages.current >= response.pages.total) {
        hasMore = false;
      } else {
        page++;
      }
    }

    // Fetch existing cross-links to exclude already-linked devices/endpoints
    const existingLinks = await prisma.deviceCrossLink.findMany({
      where: { tenantId },
      select: { ninjaDeviceId: true, sophosEndpointId: true },
    });

    const linkedNinjaIds = new Set(existingLinks.map((l) => l.ninjaDeviceId));
    const linkedSophosIds = new Set(existingLinks.map((l) => l.sophosEndpointId));

    // Filter out already-linked devices/endpoints
    const availableNinjaDevices = ninjaDevices.filter(
      (d) => !linkedNinjaIds.has(d.id),
    );
    const availableSophosEndpoints = allSophosEndpoints.filter(
      (e) => !linkedSophosIds.has(e.id),
    );

    // Build hostname lookup for Sophos endpoints
    const sophosHostnameMap = new Map<string, SophosEndpoint>();
    for (const endpoint of availableSophosEndpoints) {
      if (endpoint.hostname) {
        sophosHostnameMap.set(endpoint.hostname.toLowerCase(), endpoint);
      }
    }

    // Match by hostname
    const suggestions: Array<{
      ninjaDeviceId: number;
      ninjaDeviceName: string;
      sophosEndpointId: string;
      sophosEndpointName: string;
    }> = [];

    // Track which Sophos endpoints have already been matched to avoid duplicates
    const matchedSophosIds = new Set<string>();

    for (const device of availableNinjaDevices) {
      if (!device.systemName) continue;

      const normalizedHostname = device.systemName.toLowerCase();
      const matchingEndpoint = sophosHostnameMap.get(normalizedHostname);

      if (matchingEndpoint && !matchedSophosIds.has(matchingEndpoint.id)) {
        matchedSophosIds.add(matchingEndpoint.id);
        suggestions.push({
          ninjaDeviceId: device.id,
          ninjaDeviceName: device.systemName || device.displayName || `Device ${device.id}`,
          sophosEndpointId: matchingEndpoint.id,
          sophosEndpointName: matchingEndpoint.hostname,
        });
      }
    }

    return NextResponse.json({ suggestions });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to auto-match devices";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
