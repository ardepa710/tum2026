import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return "N/A";
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (from || to) {
    const startedAt: Record<string, Date> = {};
    if (from) startedAt.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setDate(toDate.getDate() + 1);
      startedAt.lt = toDate;
    }
    where.startedAt = startedAt;
  }

  const runs = await prisma.taskRun.findMany({
    where,
    include: {
      task: { select: { taskName: true } },
      tenant: { select: { tenantAbbrv: true } },
    },
    orderBy: { startedAt: "desc" },
    take: 2000,
  });

  const rows = runs.map((run) => ({
    date: run.startedAt.toISOString().split("T")[0],
    task: run.task.taskName,
    tenant: run.tenant.tenantAbbrv,
    actor: run.actor,
    targetUser: run.targetUser || "",
    status: run.status,
    duration: formatDuration(run.durationMs),
    ticket: run.ticketNumber || "",
  }));

  return Response.json(rows);
}
