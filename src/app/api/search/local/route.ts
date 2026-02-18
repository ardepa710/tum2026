import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2)
    return Response.json({ tenants: [], tasks: [], technicians: [], runbooks: [] });

  const [tenants, tasks, technicians, runbooks] = await Promise.all([
    prisma.tenant.findMany({
      where: {
        OR: [
          { tenantName: { contains: q, mode: "insensitive" } },
          { tenantAbbrv: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, tenantName: true, tenantAbbrv: true },
      take: 5,
    }),
    prisma.masterTask.findMany({
      where: {
        OR: [
          { taskName: { contains: q, mode: "insensitive" } },
          { taskCode: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, taskName: true, taskCode: true },
      take: 5,
    }),
    prisma.technician.findMany({
      where: {
        OR: [
          { displayName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, displayName: true, email: true },
      take: 5,
    }),
    prisma.runbook.findMany({
      where: { title: { contains: q, mode: "insensitive" } },
      select: { id: true, title: true, category: true },
      take: 5,
    }),
  ]);

  return Response.json({ tenants, tasks, technicians, runbooks });
}
