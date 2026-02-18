import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUsers, getConditionalAccessPolicies } from "@/lib/graph";
import { calculateHealthScore } from "@/lib/health-score";

export async function GET() {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const tenants = await prisma.tenant.findMany({
    select: { id: true, tenantAbbrv: true },
  });

  const results = await Promise.allSettled(
    tenants.map(async (tenant) => {
      const [users, policies, health] = await Promise.all([
        getUsers(tenant.id),
        getConditionalAccessPolicies(tenant.id),
        calculateHealthScore(tenant.id),
      ]);

      const enabledPolicies = (policies as { state?: string }[]).filter(
        (p) => p.state === "enabled"
      ).length;

      const enabledUsers = (
        users as { accountEnabled?: boolean }[]
      ).filter((u) => u.accountEnabled).length;

      const disabledUsers = (
        users as { accountEnabled?: boolean }[]
      ).filter((u) => !u.accountEnabled).length;

      return {
        tenantAbbrv: tenant.tenantAbbrv,
        enabledPolicies,
        enabledUsers,
        disabledUsers,
        healthScore: health.score,
      };
    })
  );

  const rows: {
    tenant: string;
    enabledPolicies: number;
    enabledUsers: number;
    disabledUsers: number;
    healthScore: number;
  }[] = [];

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const { tenantAbbrv, enabledPolicies, enabledUsers, disabledUsers, healthScore } =
      result.value;
    rows.push({
      tenant: tenantAbbrv,
      enabledPolicies,
      enabledUsers,
      disabledUsers,
      healthScore,
    });
  }

  return Response.json(rows);
}
