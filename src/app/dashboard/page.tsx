import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ActionBadge } from "@/components/action-badge";
import { AlertBanner } from "@/components/alert-banner";
import { DashboardCharts } from "@/components/dashboard-charts";
import { FavoritesWidget } from "@/components/favorites-widget";
import { getSessionRole, hasMinRole } from "@/lib/rbac";
import {
  Building2,
  Wrench,
  Cog,
  ScrollText,
  CreditCard,
  Plus,
  Activity,
} from "lucide-react";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function DashboardPage() {
  const role = await getSessionRole();

  const [tenantCount, technicianCount, masterTaskCount, auditCount24h, recentLogs] =
    await Promise.all([
      prisma.tenant.count(),
      prisma.technician.count(),
      prisma.masterTask.count(),
      prisma.auditLog.count({
        where: { timestamp: { gte: new Date(Date.now() - 86400000) } },
      }),
      prisma.auditLog.findMany({
        orderBy: { timestamp: "desc" },
        take: 10,
      }),
    ]);

  const cards = [
    {
      title: "Total Tenants",
      value: tenantCount,
      icon: Building2,
      color: "var(--accent)",
    },
    {
      title: "Total Technicians",
      value: technicianCount,
      icon: Wrench,
      color: "var(--success)",
    },
    {
      title: "Master Tasks",
      value: masterTaskCount,
      icon: Cog,
      color: "var(--warning)",
    },
    {
      title: "Audit Events (24h)",
      value: auditCount24h,
      icon: ScrollText,
      color: "var(--error)",
    },
  ];

  const quickActions = [
    {
      label: "Sync Technicians",
      href: "/dashboard/technicians",
      icon: Wrench,
    },
    {
      label: "View Licenses",
      href: "/dashboard/licenses",
      icon: CreditCard,
    },
    {
      label: "Audit Logs",
      href: "/dashboard/logs",
      icon: ScrollText,
    },
    {
      label: "Add Tenant",
      href: "/dashboard/tenants/new",
      icon: Plus,
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
          Dashboard
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Overview of your managed tenants and tasks
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[var(--text-secondary)]">
                  {card.title}
                </span>
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${card.color}20` }}
                >
                  <Icon className="w-5 h-5" style={{ color: card.color }} />
                </div>
              </div>
              <p className="text-3xl font-bold text-[var(--text-primary)]">
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Alert Banner */}
      <AlertBanner />

      {/* Analytics Charts */}
      <DashboardCharts />

      {/* Two-Column Layout: Recent Activity + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Activity className="w-5 h-5 text-[var(--accent)]" />
              Recent Activity
            </h3>
            <Link
              href="/dashboard/logs"
              className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
            >
              View all
            </Link>
          </div>

          {recentLogs.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-[var(--bg-hover)] rounded-xl flex items-center justify-center mx-auto mb-3">
                <ScrollText className="w-6 h-6 text-[var(--text-muted)]" />
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                No recent activity to display.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 py-2 border-b border-[var(--border)] last:border-b-0"
                >
                  <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap mt-0.5 min-w-[52px]">
                    {timeAgo(log.timestamp)}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    <span className="text-xs text-[var(--text-secondary)] truncate max-w-[120px]">
                      {log.actor}
                    </span>
                    <ActionBadge action={log.action} />
                    <span className="text-xs text-[var(--text-primary)] font-mono">
                      {log.entity}
                    </span>
                    {log.entityId && (
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        #{log.entityId}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions (EDITOR+) or Favorites Widget (VIEWER) */}
        {hasMinRole(role, "EDITOR") ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--accent)] transition-colors flex flex-col items-center gap-2 text-center"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[var(--bg-hover)] flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[var(--text-secondary)]" />
                    </div>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {action.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <FavoritesWidget />
        )}
      </div>

      {/* Favorites Widget (EDITOR+ sees it below, VIEWER sees it in the grid above) */}
      {hasMinRole(role, "EDITOR") && (
        <div className="mt-6">
          <FavoritesWidget />
        </div>
      )}
    </div>
  );
}
