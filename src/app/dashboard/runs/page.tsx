import { prisma } from "@/lib/prisma";
import { RunFilters } from "@/components/run-filters";
import { RunsTable } from "@/components/runs-table";
import { History } from "lucide-react";

const MAX_ROWS = 500;

export default async function TaskRunsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const filterStatus = params.status || "";
  const filterTask = params.task || "";
  const filterActor = params.actor || "";

  // Build where clause
  const where: Record<string, unknown> = {};
  if (filterStatus) where.status = filterStatus;
  if (filterTask) where.taskId = Number(filterTask);
  if (filterActor) where.actor = filterActor;

  const [runs, totalCount, distinctStatuses, distinctTasks, distinctActors] =
    await Promise.all([
      prisma.taskRun.findMany({
        where,
        include: {
          task: { select: { taskName: true } },
          tenant: { select: { tenantAbbrv: true } },
        },
        orderBy: { startedAt: "desc" },
        take: MAX_ROWS,
      }),
      prisma.taskRun.count({ where }),
      prisma.taskRun.findMany({
        select: { status: true },
        distinct: ["status"],
        orderBy: { status: "asc" },
      }),
      prisma.taskRun.findMany({
        select: { taskId: true, task: { select: { taskName: true } } },
        distinct: ["taskId"],
        orderBy: { taskId: "asc" },
      }),
      prisma.taskRun.findMany({
        select: { actor: true },
        distinct: ["actor"],
        orderBy: { actor: "asc" },
      }),
    ]);

  const tableData = runs.map((run) => ({
    id: run.id,
    startedAt: run.startedAt.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    actor: run.actor,
    taskName: run.task.taskName,
    targetUser: run.targetUser ?? null,
    tenantAbbrv: run.tenant.tenantAbbrv,
    status: run.status,
    durationMs: run.durationMs ?? null,
    ticketNumber: run.ticketNumber ?? null,
  }));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Task Execution History
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {totalCount} run{totalCount !== 1 ? "s" : ""} recorded
          </p>
        </div>
        <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
          <History className="w-5 h-5" style={{ color: "var(--accent)" }} />
        </div>
      </div>

      {/* Filters */}
      <RunFilters
        statuses={distinctStatuses.map((s) => s.status)}
        tasks={distinctTasks.map((t) => ({ id: t.taskId, taskName: t.task.taskName }))}
        actors={distinctActors.map((a) => a.actor)}
      />

      {/* Table */}
      {runs.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-[var(--bg-hover)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <History className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            No task runs yet
          </h3>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
            Task executions will appear here once automation tasks are run.
          </p>
        </div>
      ) : (
        <RunsTable data={tableData} />
      )}
    </div>
  );
}
