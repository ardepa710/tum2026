import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServiceHealth, getServiceHealthIssues } from "@/lib/graph";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json([], { status: 401 });

  const tenants = await prisma.tenant.findMany({
    select: { id: true, tenantName: true, tenantAbbrv: true },
  });

  const results = await Promise.allSettled(
    tenants.map(async (tenant) => {
      const [health, issues] = await Promise.all([
        getServiceHealth(tenant.id),
        getServiceHealthIssues(tenant.id),
      ]);
      return { tenant, health, issues };
    })
  );

  const data = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
    .map((r) => r.value);

  return NextResponse.json(data);
}
