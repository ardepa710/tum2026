import { prisma } from "@/lib/prisma";
import {
  Building2,
  KeyRound,
  ListTodo,
  CheckCircle2,
} from "lucide-react";

async function getStats() {
  const [tenantCount, taskCount] = await Promise.all([
    prisma.tenant.count(),
    prisma.automationTask.count(),
  ]);

  const [pendingTasks, completedTasks] = await Promise.all([
    prisma.automationTask.count({ where: { status: "PENDING" } }),
    prisma.automationTask.count({ where: { status: "COMPLETED" } }),
  ]);

  return { tenantCount, taskCount, pendingTasks, completedTasks };
}

export default async function DashboardPage() {
  const stats = await getStats();

  const cards = [
    {
      title: "Total Tenants",
      value: stats.tenantCount,
      icon: Building2,
      color: "var(--accent)",
    },
    {
      title: "Completed Tasks",
      value: stats.completedTasks,
      icon: CheckCircle2,
      color: "var(--success)",
    },
    {
      title: "Automation Tasks",
      value: stats.taskCount,
      icon: ListTodo,
      color: "var(--warning)",
    },
    {
      title: "Pending Tasks",
      value: stats.pendingTasks,
      icon: KeyRound,
      color: "var(--error)",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h2>
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

      {/* Placeholder sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Recent Activity
          </h3>
          <p className="text-sm text-[var(--text-muted)]">
            No recent activity to display.
          </p>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Task Overview
          </h3>
          <p className="text-sm text-[var(--text-muted)]">
            No tasks configured yet. Add tenants and configure automation tasks to get started.
          </p>
        </div>
      </div>
    </div>
  );
}
