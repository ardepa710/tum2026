import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DeletePermissionButton } from "@/components/delete-permission-button";
import { TechPermissionManager } from "@/components/tech-permission-manager";
import {
  ShieldCheck,
  Code,
  FileText,
  CheckCircle2,
  XCircle,
  Pencil,
  ArrowLeft,
  ListTodo,
  Users,
  Calendar,
  User,
  UserRound,
} from "lucide-react";

export default async function PermissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const permId = Number(id);
  if (isNaN(permId)) notFound();

  const permission = await prisma.permission.findUnique({
    where: { id: permId },
    include: {
      taskPermissions: {
        include: { task: { select: { id: true, taskName: true, taskCode: true } } },
        orderBy: { taskId: "asc" },
      },
      userPermissions: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
        orderBy: { assignedAt: "desc" },
      },
      techPermissions: {
        select: { id: true, techName: true, techEmail: true },
        orderBy: { techName: "asc" },
      },
    },
  });

  if (!permission) notFound();

  return (
    <div>
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href="/dashboard/permissions"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Permissions
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[var(--accent)]/10 rounded-xl flex items-center justify-center">
            <ShieldCheck
              className="w-7 h-7"
              style={{ color: "var(--accent)" }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-[var(--text-primary)] font-mono">
                {permission.permissionCode}
              </h2>
              {permission.permissionEnabled ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--success)]/10 text-[var(--success)] text-xs rounded-md">
                  <CheckCircle2 className="w-3 h-3" />
                  Enabled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--error)]/10 text-[var(--error)] text-xs rounded-md">
                  <XCircle className="w-3 h-3" />
                  Disabled
                </span>
              )}
            </div>
            {permission.permissionDescription && (
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                {permission.permissionDescription}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/permissions/${permission.id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--accent)] text-sm text-[var(--text-primary)] font-medium rounded-lg transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </Link>
          <DeletePermissionButton permissionId={permission.id} />
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Registration */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
            Registration
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-secondary)]">
                {permission.registeredBy}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-secondary)]">
                {permission.registeredDttm.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
            Usage
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs text-[var(--text-muted)]">Tasks</span>
              <p className="text-xl font-bold text-[var(--text-primary)]">
                {permission.taskPermissions.length}
              </p>
            </div>
            <div>
              <span className="text-xs text-[var(--text-muted)]">Users</span>
              <p className="text-xl font-bold text-[var(--text-primary)]">
                {permission.userPermissions.length}
              </p>
            </div>
          </div>
        </div>

        {/* ID Card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
            Identifiers
          </h3>
          <div className="space-y-2">
            <div>
              <span className="text-xs text-[var(--text-muted)]">
                Internal ID
              </span>
              <p className="text-sm text-[var(--text-secondary)] font-mono">
                {permission.id}
              </p>
            </div>
            <div>
              <span className="text-xs text-[var(--text-muted)]">Code</span>
              <p className="text-sm text-[var(--text-secondary)] font-mono">
                {permission.permissionCode}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Linked Tasks */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <ListTodo
            className="w-5 h-5"
            style={{ color: "var(--accent)" }}
          />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Tasks with this Permission
          </h3>
        </div>
        {permission.taskPermissions.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            No tasks assigned yet.
          </p>
        ) : (
          <div className="space-y-2">
            {permission.taskPermissions.map((tp) => (
              <Link
                key={tp.taskId}
                href={`/dashboard/tasks/${tp.taskId}`}
                className="flex items-center justify-between px-3 py-2 bg-[var(--bg-primary)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
              >
                <span className="text-sm text-[var(--text-primary)]">
                  {tp.task.taskName}
                </span>
                <span className="text-xs text-[var(--text-muted)] font-mono">
                  {tp.task.taskCode}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Linked Users */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5" style={{ color: "var(--accent)" }} />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Users with this Permission
          </h3>
        </div>
        {permission.userPermissions.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            No users assigned yet.
          </p>
        ) : (
          <div className="space-y-2">
            {permission.userPermissions.map((up) => (
              <div
                key={up.userId}
                className="flex items-center justify-between px-3 py-2 bg-[var(--bg-primary)] rounded-lg"
              >
                <div className="flex items-center gap-2">
                  {up.user.image ? (
                    <img
                      src={up.user.image}
                      alt=""
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                      <User className="w-3 h-3 text-[var(--accent)]" />
                    </div>
                  )}
                  <span className="text-sm text-[var(--text-primary)]">
                    {up.user.name || up.user.email}
                  </span>
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  {up.assignedAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Technicians */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 mt-4">
        <div className="flex items-center gap-2 mb-4">
          <UserRound
            className="w-5 h-5"
            style={{ color: "var(--accent)" }}
          />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Technicians with this Permission
          </h3>
          <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-hover)] px-1.5 py-0.5 rounded-full">
            {permission.techPermissions.length}
          </span>
        </div>
        <TechPermissionManager
          permissionId={permission.id}
          technicians={permission.techPermissions}
        />
      </div>
    </div>
  );
}
