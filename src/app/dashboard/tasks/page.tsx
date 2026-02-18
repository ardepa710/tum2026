import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Cog,
  Plus,
  Code,
  FolderOpen,
  Monitor,
  Ticket,
  UserCheck,
  RefreshCw,
} from "lucide-react";

export default async function TasksPage() {
  const tasks = await prisma.masterTask.findMany({
    orderBy: { id: "asc" },
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Tasks
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <Link
          href="/dashboard/tasks/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </Link>
      </div>

      {/* Task Grid */}
      {tasks.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-[var(--bg-hover)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Cog className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            No tasks yet
          </h3>
          <p className="text-sm text-[var(--text-muted)] mb-6 max-w-md mx-auto">
            Get started by adding your first automation task definition.
          </p>
          <Link
            href="/dashboard/tasks/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Your First Task
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={`/dashboard/tasks/${task.id}`}
              className="group bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--accent)] transition-all hover:shadow-lg hover:shadow-[var(--accent)]/5"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
                    <Cog
                      className="w-5 h-5"
                      style={{ color: "var(--accent)" }}
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                      {task.taskName}
                    </h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Code className="w-3 h-3 text-[var(--text-muted)]" />
                      <span className="text-xs text-[var(--text-muted)] font-mono">
                        {task.taskCode}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details preview */}
              {task.taskDetails && (
                <p className="text-xs text-[var(--text-secondary)] mb-3 line-clamp-2">
                  {task.taskDetails}
                </p>
              )}

              {/* Group & System */}
              <div className="space-y-1.5 mb-3">
                {task.taskGroup && (
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span className="text-xs text-[var(--text-secondary)]">
                      {task.taskGroup}
                    </span>
                  </div>
                )}
                {task.systemMgr && (
                  <div className="flex items-center gap-2">
                    <Monitor className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span className="text-xs text-[var(--text-secondary)]">
                      {task.systemMgr}
                    </span>
                  </div>
                )}
              </div>

              {/* Flags */}
              <div className="pt-3 border-t border-[var(--border)] flex items-center gap-2 flex-wrap">
                {task.ticketRequired && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--warning)]/10 text-[var(--warning)] text-xs rounded-md">
                    <Ticket className="w-3 h-3" />
                    Ticket
                  </span>
                )}
                {task.usernameRequired && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--accent)]/10 text-[var(--accent)] text-xs rounded-md">
                    <UserCheck className="w-3 h-3" />
                    Username
                  </span>
                )}
                {task.syncRequired && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--success)]/10 text-[var(--success)] text-xs rounded-md">
                    <RefreshCw className="w-3 h-3" />
                    Sync
                  </span>
                )}
                {!task.ticketRequired &&
                  !task.usernameRequired &&
                  !task.syncRequired && (
                    <span className="text-xs text-[var(--text-muted)]">
                      No flags
                    </span>
                  )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
