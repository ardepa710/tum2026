import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  Building2,
  Globe,
  Shield,
  CheckCircle2,
  XCircle,
  KeyRound,
  ListTodo,
  Calendar,
} from "lucide-react";

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      automationTasks: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!tenant) {
    notFound();
  }

  const hasAzureConfig =
    tenant.azureTenantId && tenant.azureClientId && tenant.azureClientSecret;

  const taskCounts = {
    total: tenant.automationTasks.length,
    pending: tenant.automationTasks.filter((t) => t.status === "PENDING")
      .length,
    running: tenant.automationTasks.filter((t) => t.status === "RUNNING")
      .length,
    completed: tenant.automationTasks.filter((t) => t.status === "COMPLETED")
      .length,
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
              {tenant.name}
            </h2>
            {tenant.domain && (
              <div className="flex items-center gap-1.5 mt-1">
                <Globe className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span className="text-sm text-[var(--text-secondary)]">
                  {tenant.domain}
                </span>
              </div>
            )}
          </div>
        </div>
        {tenant.isActive ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--success)]/10 text-[var(--success)]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--error)]/10 text-[var(--error)]">
            <XCircle className="w-3.5 h-3.5" />
            Inactive
          </span>
        )}
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Azure Config Card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield
              className="w-5 h-5"
              style={{
                color: hasAzureConfig ? "var(--success)" : "var(--warning)",
              }}
            />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Azure Configuration
            </h3>
          </div>
          <div className="space-y-3">
            <div>
              <span className="text-xs text-[var(--text-muted)]">
                Tenant ID
              </span>
              <p className="text-sm text-[var(--text-secondary)] font-mono truncate">
                {tenant.azureTenantId || "Not configured"}
              </p>
            </div>
            <div>
              <span className="text-xs text-[var(--text-muted)]">
                Client ID
              </span>
              <p className="text-sm text-[var(--text-secondary)] font-mono truncate">
                {tenant.azureClientId || "Not configured"}
              </p>
            </div>
            <div>
              <span className="text-xs text-[var(--text-muted)]">
                Client Secret
              </span>
              <p className="text-sm text-[var(--text-secondary)]">
                {tenant.azureClientSecret ? "********" : "Not configured"}
              </p>
            </div>
          </div>
          {!hasAzureConfig && (
            <div className="mt-4 pt-3 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--warning)]">
                Configure Azure credentials to enable AD management features.
              </p>
            </div>
          )}
        </div>

        {/* Task Summary Card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ListTodo
              className="w-5 h-5"
              style={{ color: "var(--accent)" }}
            />
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
              <span className="text-xs text-[var(--text-muted)]">
                Completed
              </span>
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

        {/* Metadata Card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar
              className="w-5 h-5"
              style={{ color: "var(--text-muted)" }}
            />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Details
            </h3>
          </div>
          <div className="space-y-3">
            <div>
              <span className="text-xs text-[var(--text-muted)]">
                Tenant ID
              </span>
              <p className="text-sm text-[var(--text-secondary)] font-mono truncate">
                {tenant.id}
              </p>
            </div>
            <div>
              <span className="text-xs text-[var(--text-muted)]">Created</span>
              <p className="text-sm text-[var(--text-secondary)]">
                {tenant.createdAt.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div>
              <span className="text-xs text-[var(--text-muted)]">
                Last Updated
              </span>
              <p className="text-sm text-[var(--text-secondary)]">
                {tenant.updatedAt.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Graph API Status */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
          Microsoft Graph API
        </h3>
        {hasAzureConfig ? (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
            <span className="text-sm text-[var(--text-secondary)]">
              Configured. Use the tabs above to browse users, groups, and
              licenses.
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--warning)]" />
            <span className="text-sm text-[var(--text-secondary)]">
              Not configured. Add Azure AD credentials (Tenant ID, Client ID,
              and Client Secret) to enable Graph API features.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
