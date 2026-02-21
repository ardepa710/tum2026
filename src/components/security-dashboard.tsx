"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Camera,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type {
  SecurityScoreResult,
  SecuritySnapshotData,
} from "@/lib/types/security";

export function SecurityDashboard({
  tenants,
  role,
}: {
  tenants: { id: number; tenantAbbrv: string }[];
  role: string;
}) {
  const [selectedTenant, setSelectedTenant] = useState<number | null>(
    tenants[0]?.id ?? null,
  );
  const [scoreResult, setScoreResult] = useState<SecurityScoreResult | null>(
    null,
  );
  const [snapshots, setSnapshots] = useState<SecuritySnapshotData[]>([]);
  const [loading, setLoading] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const fetchScore = useCallback(async (tenantId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/security/score?tenantId=${tenantId}`);
      if (res.ok) {
        const data: SecurityScoreResult = await res.json();
        setScoreResult(data);
      }
    } catch {
      setScoreResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSnapshots = useCallback(async (tenantId: number) => {
    setSnapshotLoading(true);
    try {
      const res = await fetch(
        `/api/security/snapshot?tenantId=${tenantId}&days=90`,
      );
      if (res.ok) {
        const data: SecuritySnapshotData[] = await res.json();
        setSnapshots(data);
      }
    } catch {
      setSnapshots([]);
    } finally {
      setSnapshotLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTenant) {
      fetchScore(selectedTenant);
      fetchSnapshots(selectedTenant);
    }
  }, [selectedTenant, fetchScore, fetchSnapshots]);

  const handleCapture = async () => {
    if (!selectedTenant) return;
    setCapturing(true);
    try {
      const res = await fetch("/api/security/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: selectedTenant }),
      });
      if (res.ok) {
        fetchSnapshots(selectedTenant);
        fetchScore(selectedTenant);
      }
    } finally {
      setCapturing(false);
    }
  };

  const scoreColor =
    (scoreResult?.totalScore ?? 0) >= 80
      ? "var(--success)"
      : (scoreResult?.totalScore ?? 0) >= 50
        ? "var(--warning)"
        : "var(--error)";

  // Radar chart data — normalize each check score to percentage of its weight
  const radarData =
    scoreResult?.checks.map((check) => ({
      category: check.category,
      value:
        check.weight > 0
          ? Math.round((check.score / check.weight) * 100)
          : 0,
      fullMark: 100,
    })) ?? [];

  // Status icon helper
  const StatusIcon = ({ status }: { status: string }) => {
    if (status === "pass")
      return <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />;
    if (status === "warning")
      return <AlertCircle className="w-4 h-4 text-[var(--warning)]" />;
    return <XCircle className="w-4 h-4 text-[var(--error)]" />;
  };

  if (tenants.length === 0) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
        <p className="text-sm text-[var(--text-muted)]">
          No tenants configured.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tenant selector + capture button */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={selectedTenant ?? ""}
          onChange={(e) => setSelectedTenant(Number(e.target.value))}
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
        >
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.tenantAbbrv}
            </option>
          ))}
        </select>

        {role === "ADMIN" && (
          <button
            onClick={handleCapture}
            disabled={capturing || loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {capturing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
            Capture Snapshot
          </button>
        )}
      </div>

      {loading ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin mx-auto mb-4" />
          <p className="text-sm text-[var(--text-secondary)]">
            Analyzing security posture...
          </p>
        </div>
      ) : scoreResult ? (
        <>
          {/* Score card + radar chart row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Card */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
                Security Score
              </h3>
              <div className="flex items-center gap-6">
                <div
                  className="w-24 h-24 rounded-full border-4 flex items-center justify-center"
                  style={{ borderColor: scoreColor }}
                >
                  <span
                    className="text-3xl font-bold"
                    style={{ color: scoreColor }}
                  >
                    {scoreResult.totalScore}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {scoreResult.totalScore >= 80
                      ? "Good security posture"
                      : scoreResult.totalScore >= 50
                        ? "Needs improvement"
                        : "Critical issues found"}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {
                      scoreResult.checks.filter((c) => c.status === "pass")
                        .length
                    }
                    /{scoreResult.checks.length} checks passing
                  </p>
                </div>
              </div>
            </div>

            {/* Radar Chart */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
                Security Radar
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis
                    dataKey="category"
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                  />
                  <Radar
                    dataKey="value"
                    stroke="var(--accent)"
                    fill="var(--accent)"
                    fillOpacity={0.2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Compliance Checklist */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
              Compliance Checklist
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider pb-2 pr-3">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider pb-2 pr-3">
                      Check
                    </th>
                    <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider pb-2 pr-3">
                      Category
                    </th>
                    <th className="text-center text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider pb-2 pr-3">
                      Score
                    </th>
                    <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider pb-2">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {scoreResult.checks.map((check) => (
                    <tr key={check.id}>
                      <td className="py-2.5 pr-3">
                        <StatusIcon status={check.status} />
                      </td>
                      <td className="py-2.5 pr-3">
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {check.name}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {check.description}
                        </p>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="text-xs text-[var(--text-secondary)]">
                          {check.category}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-center">
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {check.score}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          /{check.weight}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <span className="text-xs text-[var(--text-secondary)]">
                          {check.details}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Trend Chart */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
              Score Trend (Last 90 Days)
            </h3>
            {snapshotLoading ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-[var(--accent)] animate-spin" />
              </div>
            ) : snapshots.length === 0 ? (
              <div className="h-48 flex items-center justify-center">
                <p className="text-sm text-[var(--text-muted)]">
                  No snapshots yet. Capture one to start tracking trends.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={snapshots.map((s) => ({
                    date: new Date(s.capturedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    }),
                    score: s.score,
                  }))}
                >
                  <CartesianGrid
                    stroke="var(--border)"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      color: "var(--text-primary)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={{ fill: "var(--accent)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <p className="text-sm text-[var(--error)]">
            Failed to load security score. Check tenant credentials.
          </p>
        </div>
      )}
    </div>
  );
}
