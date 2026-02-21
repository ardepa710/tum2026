import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeOptimization } from "@/lib/license-optimizer";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenants = await prisma.tenant.findMany({
    select: { id: true, tenantAbbrv: true, tenantIdMsft: true },
  });

  const summary = await analyzeOptimization(tenants);
  return NextResponse.json(summary);
}
