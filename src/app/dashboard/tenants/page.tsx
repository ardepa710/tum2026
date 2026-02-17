import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Building2,
  Plus,
  Hash,
  ListTodo,
  KeyRound,
  Calendar,
} from "lucide-react";

export default async function TenantsPage() {
  const tenants = await prisma.tenant.findMany({
    include: {
      _count: {
        select: { automationTasks: true },
      },
    },
    orderBy: { regDttm: "desc" },
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Tenants
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {tenants.length} tenant{tenants.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <Link
          href="/dashboard/tenants/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Tenant
        </Link>
      </div>

      {/* Tenant Grid */}
      {tenants.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-[var(--bg-hover)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            No tenants yet
          </h3>
          <p className="text-sm text-[var(--text-muted)] mb-6 max-w-md mx-auto">
            Get started by adding your first tenant.
          </p>
          <Link
            href="/dashboard/tenants/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Your First Tenant
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tenants.map((tenant) => (
            <Link
              key={tenant.id}
              href={`/dashboard/tenants/${tenant.id}`}
              className="group bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--accent)] transition-all hover:shadow-lg hover:shadow-[var(--accent)]/5"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
                    <Building2
                      className="w-5 h-5"
                      style={{ color: "var(--accent)" }}
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                      {tenant.tenantName}
                    </h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Hash className="w-3 h-3 text-[var(--text-muted)]" />
                      <span className="text-xs text-[var(--text-muted)] font-mono">
                        {tenant.tenantAbbrv}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* IDs */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span className="text-xs text-[var(--text-muted)]">MSFT:</span>
                  <span className="text-xs text-[var(--text-secondary)] font-mono truncate">
                    {tenant.tenantIdMsft}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <KeyRound className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span className="text-xs text-[var(--text-muted)]">Rewst:</span>
                  <span className="text-xs text-[var(--text-secondary)] font-mono truncate">
                    {tenant.tenantIdRewst}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <ListTodo className="w-3.5 h-3.5" />
                  <span>
                    {tenant._count.automationTasks} task{tenant._count.automationTasks !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {tenant.regDttm.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
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
