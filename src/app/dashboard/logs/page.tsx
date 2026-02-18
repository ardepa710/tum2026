import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { LogFilters } from "@/components/log-filters";
import { LogsTable } from "@/components/logs-table";
import { ScrollText } from "lucide-react";

const MAX_ROWS = 1000;

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole("EDITOR");
  const params = await searchParams;
  const filterActor = params.actor || "";
  const filterEntity = params.entity || "";
  const filterAction = params.action || "";
  const filterFrom = params.from || "";
  const filterTo = params.to || "";

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

  const [logs, totalCount, actors, entities, actions] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: MAX_ROWS,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ select: { actor: true }, distinct: ["actor"], orderBy: { actor: "asc" } }),
    prisma.auditLog.findMany({ select: { entity: true }, distinct: ["entity"], orderBy: { entity: "asc" } }),
    prisma.auditLog.findMany({ select: { action: true }, distinct: ["action"], orderBy: { action: "asc" } }),
  ]);

  const tableData = logs.map((log) => ({
    id: log.id,
    timestamp: log.timestamp.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    actor: log.actor,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId ?? null,
    details: log.details ?? null,
  }));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Audit Logs
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {totalCount} event{totalCount !== 1 ? "s" : ""} recorded
          </p>
        </div>
        <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
          <ScrollText className="w-5 h-5" style={{ color: "var(--accent)" }} />
        </div>
      </div>

      {/* Filters (client component for instant navigation) */}
      <LogFilters
        actors={actors.map((a) => a.actor)}
        entities={entities.map((e) => e.entity)}
        actions={actions.map((a) => a.action)}
      />

      {/* Table */}
      {logs.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-[var(--bg-hover)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ScrollText className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            No audit logs yet
          </h3>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
            Actions like creating tenants, syncing technicians, or changing permissions will appear here.
          </p>
        </div>
      ) : (
        <LogsTable data={tableData} />
      )}
    </div>
  );
}
