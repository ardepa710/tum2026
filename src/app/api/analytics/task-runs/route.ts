import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const days = Number(request.nextUrl.searchParams.get("days")) || 30;
  const since = new Date(Date.now() - days * 86400000);

  const runs = await prisma.taskRun.findMany({
    where: { startedAt: { gte: since } },
    select: { startedAt: true, status: true },
    orderBy: { startedAt: "asc" },
  });

  const grouped: Record<
    string,
    { date: string; SUCCESS: number; FAILED: number; RUNNING: number }
  > = {};
  for (const run of runs) {
    const date = run.startedAt.toISOString().split("T")[0];
    if (!grouped[date])
      grouped[date] = { date, SUCCESS: 0, FAILED: 0, RUNNING: 0 };
    const status = run.status as "SUCCESS" | "FAILED" | "RUNNING";
    grouped[date][status]++;
  }

  return Response.json(Object.values(grouped));
}
