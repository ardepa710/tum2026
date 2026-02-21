import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DeleteTaskButton } from "@/components/delete-task-button";
import { TaskPermissionManager } from "@/components/task-permission-manager";
import { BookmarkButton } from "@/components/bookmark-button";
import {
  Cog,
  Code,
  FileText,
  Ticket,
  UserCheck,
  RefreshCw,
  Webhook,
  Building2,
  FolderOpen,
  Monitor,
  Pencil,
  ArrowLeft,
} from "lucide-react";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const taskId = Number(id);
  if (isNaN(taskId)) notFound();

  const [task, allPermissions] = await Promise.all([
    prisma.masterTask.findUnique({
      where: { id: taskId },
      include: {
        taskPermissions: {
          include: { permission: { select: { id: true, permissionCode: true, permissionEnabled: true } } },
          orderBy: { permissionId: "asc" },
        },
      },
    }),
    prisma.permission.findMany({
      where: { permissionEnabled: true },
      select: { id: true, permissionCode: true },
      orderBy: { permissionCode: "asc" },
    }),
  ]);

  if (!task) notFound();

  return (
    <div>
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href="/dashboard/tasks"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tasks
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[var(--accent)]/10 rounded-xl flex items-center justify-center">
            <Cog className="w-7 h-7" style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                {task.taskName}
              </h2>
              <BookmarkButton
                entityType="task"
                entityId={String(task.id)}
                label={task.taskName}
                metadata={{ taskCode: task.taskCode }}
              />
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <Code className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-sm text-[var(--text-secondary)] font-mono">
                {task.taskCode}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/tasks/${task.id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--accent)] text-sm text-[var(--text-primary)] font-medium rounded-lg transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </Link>
          <DeleteTaskButton taskId={task.id} />
        </div>
      </div>

      {/* Details */}
      {task.taskDetails && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <FileText
              className="w-5 h-5"
              style={{ color: "var(--accent)" }}
            />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Details
            </h3>
          </div>
          <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
            {task.taskDetails}
          </p>
        </div>
      )}

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Configuration Flags */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Configuration Flags
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-sm text-[var(--text-secondary)]">
                  Ticket Required
                </span>
              </div>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                  task.ticketRequired
                    ? "bg-[var(--success)]/10 text-[var(--success)]"
                    : "bg-[var(--bg-hover)] text-[var(--text-muted)]"
                }`}
              >
                {task.ticketRequired ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-sm text-[var(--text-secondary)]">
                  Username Required
                </span>
              </div>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                  task.usernameRequired
                    ? "bg-[var(--success)]/10 text-[var(--success)]"
                    : "bg-[var(--bg-hover)] text-[var(--text-muted)]"
                }`}
              >
                {task.usernameRequired ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-sm text-[var(--text-secondary)]">
                  Sync Required
                </span>
              </div>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                  task.syncRequired
                    ? "bg-[var(--success)]/10 text-[var(--success)]"
                    : "bg-[var(--bg-hover)] text-[var(--text-muted)]"
                }`}
              >
                {task.syncRequired ? "Yes" : "No"}
              </span>
            </div>
          </div>
        </div>

        {/* Integration */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Integration
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Webhook className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-xs text-[var(--text-muted)]">
                  Rewst Webhook
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] font-mono truncate">
                {task.rewstWebhook || "—"}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-xs text-[var(--text-muted)]">
                  Tenant Exclusive
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                {task.tenantExclusive || "All tenants"}
              </p>
            </div>
          </div>
        </div>

        {/* Access Control */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Access Control
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FolderOpen className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-xs text-[var(--text-muted)]">
                  Task Group
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                {task.taskGroup || "—"}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Monitor className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-xs text-[var(--text-muted)]">
                  System Manager
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                {task.systemMgr || "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Permissions Manager */}
      <TaskPermissionManager
        taskId={task.id}
        assigned={task.taskPermissions}
        available={allPermissions}
      />
    </div>
  );
}
