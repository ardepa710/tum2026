import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function escapeCsvValue(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const filterFrom = searchParams.get("from") || "";
  const filterTo = searchParams.get("to") || "";
  const filterActor = searchParams.get("actor") || "";
  const filterEntity = searchParams.get("entity") || "";
  const filterAction = searchParams.get("action") || "";

  // Build where clause
  const where: Record<string, unknown> = {};
  if (filterActor) where.actor = filterActor;
  if (filterEntity) where.entity = filterEntity;
  if (filterAction) where.action = filterAction;

  if (filterFrom || filterTo) {
    const timestamp: Record<string, Date> = {};
    if (filterFrom) {
      timestamp.gte = new Date(filterFrom);
    }
    if (filterTo) {
      // Add 1 day to include the full "to" day
      const toDate = new Date(filterTo);
      toDate.setDate(toDate.getDate() + 1);
      timestamp.lte = toDate;
    }
    where.timestamp = timestamp;
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { timestamp: "desc" },
    take: 10000,
  });

  // Build CSV
  const headers = "Timestamp,Actor,Action,Entity,Entity ID,Details";
  const rows = logs.map((log) => {
    const timestamp = log.timestamp.toISOString();
    const actor = escapeCsvValue(log.actor);
    const action = escapeCsvValue(log.action);
    const entity = escapeCsvValue(log.entity);
    const entityId = escapeCsvValue(log.entityId ?? "");
    const details = escapeCsvValue(log.details ?? "");
    return `${timestamp},${actor},${action},${entity},${entityId},${details}`;
  });

  const csv = [headers, ...rows].join("\n");
  const today = new Date().toISOString().split("T")[0];

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="audit-logs-${today}.csv"`,
    },
  });
}
