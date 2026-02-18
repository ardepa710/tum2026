import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const days = Number(request.nextUrl.searchParams.get("days")) || 14;
  const since = new Date(Date.now() - days * 86400000);

  const logs = await prisma.auditLog.findMany({
    where: { timestamp: { gte: since } },
    select: { timestamp: true },
    orderBy: { timestamp: "asc" },
  });

  const grouped: Record<string, { date: string; count: number }> = {};
  for (const log of logs) {
    const date = log.timestamp.toISOString().split("T")[0];
    if (!grouped[date]) grouped[date] = { date, count: 0 };
    grouped[date].count++;
  }

  return Response.json(Object.values(grouped));
}
