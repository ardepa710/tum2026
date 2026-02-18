import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLicenses } from "@/lib/graph";

export async function GET() {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const tenants = await prisma.tenant.findMany({
    select: { id: true, tenantAbbrv: true },
  });

  const results = await Promise.allSettled(
    tenants.map(async (tenant) => {
      const licenses = await getLicenses(tenant.id);
      return { tenantAbbrv: tenant.tenantAbbrv, licenses };
    })
  );

  const rows: {
    tenant: string;
    sku: string;
    total: number;
    consumed: number;
    available: number;
    utilization: string;
  }[] = [];

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const { tenantAbbrv, licenses } = result.value;
    for (const lic of licenses as {
      skuPartNumber?: string;
      prepaidUnits?: { enabled?: number };
      consumedUnits?: number;
    }[]) {
      const total = lic.prepaidUnits?.enabled || 0;
      const consumed = lic.consumedUnits || 0;
      const available = total - consumed;
      const utilization =
        total > 0 ? `${Math.round((consumed / total) * 100)}%` : "N/A";
      rows.push({
        tenant: tenantAbbrv,
        sku: lic.skuPartNumber || "Unknown",
        total,
        consumed,
        available,
        utilization,
      });
    }
  }

  return Response.json(rows);
}
