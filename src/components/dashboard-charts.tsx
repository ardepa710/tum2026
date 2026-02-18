"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { Loader2 } from "lucide-react";

const CHART_COLORS = {
  success: "#10b981",
  failed: "#ef4444",
  accent: "#3b82f6",
  muted: "#64748b",
};
const PIE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
];

function ChartCard({
  title,
  children,
  loading,
}: {
  title: string;
  children: React.ReactNode;
  loading: boolean;
}) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
        {title}
      </h3>
      {loading ? (
        <div className="h-52 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-[var(--text-muted)] animate-spin" />
        </div>
      ) : (
        <div className="h-52">{children}</div>
      )}
    </div>
  );
}

function TaskRunsChart() {
  const [data, setData] = useState<
    { date: string; SUCCESS: number; FAILED: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/task-runs?days=30")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <ChartCard title="Task Runs (Last 30 Days)" loading={loading}>
      {data.length === 0 ? (
        <div className="h-full flex items-center justify-center text-sm text-[var(--text-muted)]">
          No task runs recorded
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: CHART_COLORS.muted }}
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis
              tick={{ fontSize: 10, fill: CHART_COLORS.muted }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #334155",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar
              dataKey="SUCCESS"
              stackId="a"
              fill={CHART_COLORS.success}
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="FAILED"
              stackId="a"
              fill={CHART_COLORS.failed}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function LicenseChart() {
  const [data, setData] = useState<
    { sku: string; consumed: number; available: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/licenses")
      .then((r) => r.json())
      .then((d: { sku: string; consumed: number; available: number }[]) =>
        setData(d.slice(0, 5))
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <ChartCard title="Top Licenses (Utilization)" loading={loading}>
      {data.length === 0 ? (
        <div className="h-full flex items-center justify-center text-sm text-[var(--text-muted)]">
          No license data
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="consumed"
              nameKey="sku"
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={2}
              label={({ name }: { name?: string }) =>
                name && name.length > 12 ? name.slice(0, 12) + "\u2026" : name
              }
              labelLine={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #334155",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function HealthOverviewChart() {
  const [data, setData] = useState<
    { tenantAbbrv: string; score: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/health-overview")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function getBarColor(score: number) {
    if (score >= 80) return CHART_COLORS.success;
    if (score >= 50) return "#f59e0b";
    return CHART_COLORS.failed;
  }

  return (
    <ChartCard title="Tenant Health Scores" loading={loading}>
      {data.length === 0 ? (
        <div className="h-full flex items-center justify-center text-sm text-[var(--text-muted)]">
          No health data
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#334155"
              horizontal={false}
            />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: CHART_COLORS.muted }}
            />
            <YAxis
              dataKey="tenantAbbrv"
              type="category"
              tick={{ fontSize: 10, fill: CHART_COLORS.muted }}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #334155",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="score" radius={[0, 4, 4, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={getBarColor(entry.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function AuditActivityChart() {
  const [data, setData] = useState<{ date: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/audit-activity?days=14")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <ChartCard title="Audit Activity (Last 14 Days)" loading={loading}>
      {data.length === 0 ? (
        <div className="h-full flex items-center justify-center text-sm text-[var(--text-muted)]">
          No audit activity
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: CHART_COLORS.muted }}
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis
              tick={{ fontSize: 10, fill: CHART_COLORS.muted }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #334155",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke={CHART_COLORS.accent}
              fill={CHART_COLORS.accent}
              fillOpacity={0.15}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function DashboardCharts() {
  return (
    <div className="space-y-6 mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TaskRunsChart />
        </div>
        <div>
          <LicenseChart />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HealthOverviewChart />
        <AuditActivityChart />
      </div>
    </div>
  );
}
