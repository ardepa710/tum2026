import { prisma } from "@/lib/prisma";
import { calculateHealthScore } from "@/lib/health-score";
import { getServiceHealth } from "@/lib/graph";

export interface Alert {
  id: string;
  type:
    | "failed_runs"
    | "low_health"
    | "service_degraded"
    | "stale_sync";
  severity: "error" | "warning" | "info";
  title: string;
  description: string;
  tenantId?: number;
  tenantName?: string;
  link?: string;
}

// Best-effort in-memory cache — resets on serverless cold starts.
// Effective within a single process lifetime (e.g., `next dev` or long-lived server).
let alertCache: { data: Alert[]; expiresAt: number } | null = null;
const CACHE_TTL = 600000; // 10 minutes

export async function generateAlerts(): Promise<Alert[]> {
  if (alertCache && alertCache.expiresAt > Date.now()) {
    return alertCache.data;
  }

  const alerts: Alert[] = [];

  // 1. Failed task runs in last 24h
  const failedRuns = await prisma.taskRun.findMany({
    where: {
      status: "FAILED",
      startedAt: { gte: new Date(Date.now() - 86400000) },
    },
    include: {
      task: { select: { taskName: true } },
      tenant: { select: { tenantAbbrv: true } },
    },
  });
  for (const run of failedRuns) {
    alerts.push({
      id: `failed-run-${run.id}`,
      type: "failed_runs",
      severity: "error",
      title: `Task "${run.task.taskName}" failed`,
      description:
        `Failed for ${run.tenant.tenantAbbrv} at ${run.startedAt.toLocaleString()}. ${run.errorMessage || ""}`.trim(),
      tenantId: run.tenantId,
      tenantName: run.tenant.tenantAbbrv,
      link: `/dashboard/runs`,
    });
  }

  // 2. Stale technician sync (> 7 days)
  const staleTechs = await prisma.technician.findMany({
    where: {
      lastSyncAt: { lt: new Date(Date.now() - 7 * 86400000) },
    },
    select: { id: true, displayName: true, lastSyncAt: true },
    take: 5,
  });
  if (staleTechs.length > 0) {
    alerts.push({
      id: "stale-sync",
      type: "stale_sync",
      severity: "info",
      title: "Technician sync is stale",
      description: `${staleTechs.length} technician(s) haven't been synced in over 7 days.`,
      link: "/dashboard/technicians",
    });
  }

  // 3. Per-tenant checks: Low health + service degradation
  const tenants = await prisma.tenant.findMany({
    select: { id: true, tenantName: true, tenantAbbrv: true },
  });

  for (const tenant of tenants) {
    // Low health score
    try {
      const { score } = await calculateHealthScore(tenant.id);
      if (score < 50) {
        alerts.push({
          id: `low-health-${tenant.id}`,
          type: "low_health",
          severity: "warning",
          title: `Low health score: ${tenant.tenantAbbrv}`,
          description: `Health score is ${score}/100.`,
          tenantId: tenant.id,
          tenantName: tenant.tenantName,
          link: `/dashboard/tenants/${tenant.id}`,
        });
      }
    } catch {
      /* skip tenant on error */
    }

    // Service degradation
    try {
      const health = await getServiceHealth(tenant.id);
      const degraded = (
        health as { status: string; service: string }[]
      ).filter((s) => s.status !== "serviceOperational");
      for (const svc of degraded) {
        alerts.push({
          id: `degraded-${tenant.id}-${svc.service}`,
          type: "service_degraded",
          severity:
            svc.status === "serviceInterruption" ? "error" : "warning",
          title: `${svc.service} degraded: ${tenant.tenantAbbrv}`,
          description: `Service status: ${svc.status}`,
          tenantId: tenant.id,
          tenantName: tenant.tenantName,
          link: `/dashboard/health`,
        });
      }
    } catch {
      /* skip */
    }
  }

  alertCache = { data: alerts, expiresAt: Date.now() + CACHE_TTL };
  return alerts;
}
