import { prisma } from "@/lib/prisma";
import {
  ListTodo,
  Plus,
  Clock,
  Play,
  CheckCircle2,
  XCircle,
  Calendar,
} from "lucide-react";

const statusConfig = {
  PENDING: {
    label: "Pending",
    color: "var(--warning)",
    icon: Clock,
  },
  RUNNING: {
    label: "Running",
    color: "var(--accent)",
    icon: Play,
  },
  COMPLETED: {
    label: "Completed",
    color: "var(--success)",
    icon: CheckCircle2,
  },
  FAILED: {
    label: "Failed",
    color: "var(--error)",
    icon: XCircle,
  },
} as const;

export default async function TenantTasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const tasks = await prisma.automationTask.findMany({
    where: { tenantId: Number(id) },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ListTodo className="w-6 h-6" style={{ color: "var(--accent)" }} />
          <h3 className="text-xl font-bold text-[var(--text-primary)]">
            Automation Tasks
          </h3>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-14 h-14 bg-[var(--bg-hover)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ListTodo className="w-7 h-7 text-[var(--text-muted)]" />
          </div>
          <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            No Tasks Yet
          </h4>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
            Create automation tasks to manage this tenant. Tasks can run
            scripts, sync data, or perform administrative actions.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const config = statusConfig[task.status];
            const StatusIcon = config.icon;

            return (
              <div
                key={task.id}
                className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--accent)]/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Task Name & Status */}
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                        {task.name}
                      </h4>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${config.color} 15%, transparent)`,
                          color: config.color,
                        }}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </span>
                    </div>

                    {/* Description */}
                    {task.description && (
                      <p className="text-sm text-[var(--text-secondary)] mb-3 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        Created{" "}
                        {task.createdAt.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      {task.lastRunAt && (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          Last run{" "}
                          {task.lastRunAt.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}{" "}
                          {task.lastRunAt.toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
