import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateHealthScore } from "@/lib/health-score";

export async function GET() {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const tenants = await prisma.tenant.findMany({
    select: { id: true, tenantAbbrv: true },
  });

  const results = await Promise.allSettled(
    tenants.map(async (tenant) => {
      const health = await calculateHealthScore(tenant.id);
      return { tenantAbbrv: tenant.tenantAbbrv, health };
    })
  );

  const rows: {
    tenant: string;
    score: number;
    users: number;
    licenses: number;
    policies: number;
  }[] = [];

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const { tenantAbbrv, health } = result.value;
    rows.push({
      tenant: tenantAbbrv,
      score: health.score,
      users: health.breakdown.users,
      licenses: health.breakdown.licenses,
      policies: health.breakdown.policies,
    });
  }

  return Response.json(rows);
}
