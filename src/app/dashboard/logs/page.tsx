import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { LogFilters } from "@/components/log-filters";
import { ActionBadge } from "@/components/action-badge";
import { ScrollText, User, Zap, Box, Hash, FileText, Clock } from "lucide-react";

const PAGE_SIZE = 50;

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole("EDITOR");
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
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
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ select: { actor: true }, distinct: ["actor"], orderBy: { actor: "asc" } }),
    prisma.auditLog.findMany({ select: { entity: true }, distinct: ["entity"], orderBy: { entity: "asc" } }),
    prisma.auditLog.findMany({ select: { action: true }, distinct: ["action"], orderBy: { action: "asc" } }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function buildUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    if (filterActor) p.set("actor", filterActor);
    if (filterEntity) p.set("entity", filterEntity);
    if (filterAction) p.set("action", filterAction);
    if (filterFrom) p.set("from", filterFrom);
    if (filterTo) p.set("to", filterTo);
    for (const [k, v] of Object.entries(overrides)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const qs = p.toString();
    return `/dashboard/logs${qs ? `?${qs}` : ""}`;
  }

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
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Timestamp
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      Actor
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      Action
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <Box className="w-3.5 h-3.5" />
                      Entity
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5" />
                      ID
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Details
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)] whitespace-nowrap">
                      {log.timestamp.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)] max-w-[200px] truncate">
                      {log.actor}
                    </td>
                    <td className="px-4 py-3">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)] font-mono">
                      {log.entity}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)] font-mono">
                      {log.entityId ?? "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)] max-w-[300px] truncate">
                      {log.details ? (
                        <code className="text-[10px] bg-[var(--bg-hover)] px-1.5 py-0.5 rounded">
                          {log.details}
                        </code>
                      ) : (
                        "\u2014"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--text-muted)]">
                Page {page} of {totalPages} ({totalCount} total)
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <a
                    href={buildUrl({ page: String(page - 1) })}
                    className="px-3 py-1.5 text-xs font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded-lg hover:text-[var(--text-primary)] transition-colors"
                  >
                    Previous
                  </a>
                )}
                {page < totalPages && (
                  <a
                    href={buildUrl({ page: String(page + 1) })}
                    className="px-3 py-1.5 text-xs font-medium bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
                  >
                    Next
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
