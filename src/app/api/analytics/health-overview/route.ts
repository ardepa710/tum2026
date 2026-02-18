import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateHealthScore } from "@/lib/health-score";

export async function GET() {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const tenants = await prisma.tenant.findMany({
    select: { id: true, tenantName: true, tenantAbbrv: true },
    orderBy: { tenantAbbrv: "asc" },
  });

  const results = await Promise.allSettled(
    tenants.map(async (tenant) => {
      const { score, breakdown } = await calculateHealthScore(tenant.id);
      return { ...tenant, score, breakdown };
    })
  );

  const data = results
    .filter(
      (
        r
      ): r is PromiseFulfilledResult<{
        id: number;
        tenantName: string;
        tenantAbbrv: string;
        score: number;
        breakdown: { users: number; licenses: number; policies: number };
      }> => r.status === "fulfilled"
    )
    .map((r) => r.value);

  return Response.json(data);
}
