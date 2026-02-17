import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  Building2,
  Hash,
  KeyRound,
  Globe,
  ListTodo,
  Calendar,
  User,
} from "lucide-react";

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenantId = Number(id);
  if (isNaN(tenantId)) notFound();

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      automationTasks: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!tenant) notFound();

  const taskCounts = {
    total: tenant.automationTasks.length,
    pending: tenant.automationTasks.filter((t) => t.status === "PENDING").length,
    completed: tenant.automationTasks.filter((t) => t.status === "COMPLETED").length,
    failed: tenant.automationTasks.filter((t) => t.status === "FAILED").length,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[var(--accent)]/10 rounded-xl flex items-center justify-center">
            <Building2 className="w-7 h-7" style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              {tenant.tenantName}
            </h2>
            <div className="flex items-center gap-1.5 mt-1">
              <Hash className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-sm text-[var(--text-secondary)] font-mono">
                {tenant.tenantAbbrv}
              </span>
            </div>
            {tenant.domainUrl && (
              <div className="flex items-center gap-1.5 mt-1">
                <Globe className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <a
                  href={tenant.domainUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--accent)] hover:underline"
                >
                  {tenant.domainUrl}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Platform IDs Card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound className="w-5 h-5" style={{ color: "var(--accent)" }} />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Platform IDs
            </h3>
          </div>
          <div className="space-y-3">
            <div>
              <span className="text-xs text-[var(--text-muted)]">
                Microsoft Tenant ID
              </span>
              <p className="text-sm text-[var(--text-secondary)] font-mono truncate">
                {tenant.tenantIdMsft}
              </p>
            </div>
            <div>
              <span className="text-xs text-[var(--text-muted)]">
                Rewst Tenant ID
              </span>
              <p className="text-sm text-[var(--text-secondary)] font-mono truncate">
                {tenant.tenantIdRewst}
              </p>
            </div>
          </div>
        </div>

        {/* Task Summary Card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ListTodo className="w-5 h-5" style={{ color: "var(--accent)" }} />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Automation Tasks
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs text-[var(--text-muted)]">Total</span>
              <p className="text-xl font-bold text-[var(--text-primary)]">
                {taskCounts.total}
              </p>
            </div>
            <div>
              <span className="text-xs text-[var(--text-muted)]">Pending</span>
              <p className="text-xl font-bold text-[var(--warning)]">
                {taskCounts.pending}
              </p>
            </div>
            <div>
              <span className="text-xs text-[var(--text-muted)]">Completed</span>
              <p className="text-xl font-bold text-[var(--success)]">
                {taskCounts.completed}
              </p>
            </div>
            <div>
              <span className="text-xs text-[var(--text-muted)]">Failed</span>
              <p className="text-xl font-bold text-[var(--error)]">
                {taskCounts.failed}
              </p>
            </div>
          </div>
        </div>

        {/* Registration Card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Registration
            </h3>
          </div>
          <div className="space-y-3">
            <div>
              <span className="text-xs text-[var(--text-muted)]">
                Registered
              </span>
              <p className="text-sm text-[var(--text-secondary)]">
                {tenant.regDttm.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div>
              <span className="text-xs text-[var(--text-muted)]">
                Registered By
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <p className="text-sm text-[var(--text-secondary)]">
                  {tenant.regUser}
                </p>
              </div>
            </div>
            <div>
              <span className="text-xs text-[var(--text-muted)]">
                Internal ID
              </span>
              <p className="text-sm text-[var(--text-secondary)] font-mono">
                {tenant.id}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
