import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import {
  ShieldCheck,
  Plus,
  Code,
  ListTodo,
  Users,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default async function PermissionsPage() {
  await requireRole("ADMIN");
  const permissions = await prisma.permission.findMany({
    include: {
      _count: {
        select: { taskPermissions: true, userPermissions: true },
      },
    },
    orderBy: { id: "asc" },
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Permissions
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {permissions.length} permission
            {permissions.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <Link
          href="/dashboard/permissions/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Permission
        </Link>
      </div>

      {/* Grid */}
      {permissions.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-[var(--bg-hover)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            No permissions yet
          </h3>
          <p className="text-sm text-[var(--text-muted)] mb-6 max-w-md mx-auto">
            Create permissions to control which technicians can execute which
            tasks.
          </p>
          <Link
            href="/dashboard/permissions/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Your First Permission
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {permissions.map((perm) => (
            <Link
              key={perm.id}
              href={`/dashboard/permissions/${perm.id}`}
              className="group bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--accent)] transition-all hover:shadow-lg hover:shadow-[var(--accent)]/5"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
                    <ShieldCheck
                      className="w-5 h-5"
                      style={{ color: "var(--accent)" }}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Code className="w-3 h-3 text-[var(--text-muted)]" />
                      <span className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors font-mono">
                        {perm.permissionCode}
                      </span>
                    </div>
                  </div>
                </div>
                {perm.permissionEnabled ? (
                  <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
                ) : (
                  <XCircle className="w-4 h-4 text-[var(--error)]" />
                )}
              </div>

              {/* Description */}
              {perm.permissionDescription && (
                <p className="text-xs text-[var(--text-secondary)] mb-3 line-clamp-2">
                  {perm.permissionDescription}
                </p>
              )}

              {/* Footer */}
              <div className="pt-3 border-t border-[var(--border)] flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <ListTodo className="w-3.5 h-3.5" />
                  <span>
                    {perm._count.taskPermissions} task
                    {perm._count.taskPermissions !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    {perm._count.userPermissions} user
                    {perm._count.userPermissions !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
