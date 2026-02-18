import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLicenses } from "@/lib/graph";

// In-memory cache
let licenseCache: { data: unknown; expiresAt: number } | null = null;
const CACHE_TTL = 3600000; // 1 hour

export async function GET() {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  if (licenseCache && licenseCache.expiresAt > Date.now()) {
    return Response.json(licenseCache.data);
  }

  const tenants = await prisma.tenant.findMany({
    select: { id: true, tenantAbbrv: true },
  });

  const skuMap: Record<
    string,
    { sku: string; total: number; consumed: number }
  > = {};

  const results = await Promise.allSettled(
    tenants.map(async (tenant) => {
      const licenses = await getLicenses(tenant.id);
      return { tenantAbbrv: tenant.tenantAbbrv, licenses };
    })
  );

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const lic of result.value.licenses as {
      skuPartNumber: string;
      prepaidUnits?: { enabled?: number };
      consumedUnits?: number;
    }[]) {
      const sku = lic.skuPartNumber || "Unknown";
      if (!skuMap[sku]) skuMap[sku] = { sku, total: 0, consumed: 0 };
      skuMap[sku].total += lic.prepaidUnits?.enabled || 0;
      skuMap[sku].consumed += lic.consumedUnits || 0;
    }
  }

  const data = Object.values(skuMap)
    .map((s) => ({
      ...s,
      available: s.total - s.consumed,
      utilization:
        s.total > 0 ? Math.round((s.consumed / s.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  licenseCache = { data, expiresAt: Date.now() + CACHE_TTL };
  return Response.json(data);
}
