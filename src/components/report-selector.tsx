"use client";

import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { pdf } from "@react-pdf/renderer";
import { ReportPdf } from "@/components/report-pdf";
import { FileBarChart, FileText, Loader2 } from "lucide-react";

// ---------- Report type definitions ----------

type ReportType =
  | "licenses"
  | "health"
  | "task-runs"
  | "security"
  | "tech-permissions";

interface ReportOption {
  value: ReportType;
  label: string;
}

const reportOptions: ReportOption[] = [
  { value: "licenses", label: "Licenses" },
  { value: "health", label: "Health Summary" },
  { value: "task-runs", label: "Task Runs" },
  { value: "security", label: "Security Posture" },
  { value: "tech-permissions", label: "Tech Permissions" },
];

// ---------- Row types ----------

interface LicenseRow {
  tenant: string;
  sku: string;
  total: number;
  consumed: number;
  available: number;
  utilization: string;
}

interface HealthRow {
  tenant: string;
  score: number;
  users: number;
  licenses: number;
  policies: number;
}

interface TaskRunRow {
  date: string;
  task: string;
  tenant: string;
  actor: string;
  targetUser: string;
  status: string;
  duration: string;
  ticket: string;
}

interface SecurityRow {
  tenant: string;
  enabledPolicies: number;
  enabledUsers: number;
  disabledUsers: number;
  healthScore: number;
}

interface TechPermRow {
  technician: string;
  email: string;
  permission: string;
  description: string;
}

// ---------- Column definitions ----------

const licenseColumns: ColumnDef<LicenseRow, unknown>[] = [
  { accessorKey: "tenant", header: "Tenant" },
  {
    accessorKey: "sku",
    header: "SKU",
    cell: ({ getValue }) => (
      <span className="font-mono text-xs">{getValue<string>()}</span>
    ),
  },
  { accessorKey: "total", header: "Total" },
  { accessorKey: "consumed", header: "Consumed" },
  { accessorKey: "available", header: "Available" },
  { accessorKey: "utilization", header: "Utilization" },
];

const healthColumns: ColumnDef<HealthRow, unknown>[] = [
  { accessorKey: "tenant", header: "Tenant" },
  {
    accessorKey: "score",
    header: "Score",
    cell: ({ getValue }) => {
      const score = getValue<number>();
      const color =
        score >= 70
          ? "text-[var(--success)]"
          : score >= 40
            ? "text-[var(--warning)]"
            : "text-[var(--error)]";
      return <span className={`font-bold ${color}`}>{score}</span>;
    },
  },
  { accessorKey: "users", header: "Users (0-40)" },
  { accessorKey: "licenses", header: "Licenses (0-30)" },
  { accessorKey: "policies", header: "Policies (0-30)" },
];

const taskRunColumns: ColumnDef<TaskRunRow, unknown>[] = [
  { accessorKey: "date", header: "Date" },
  {
    accessorKey: "task",
    header: "Task",
    cell: ({ getValue }) => (
      <span className="text-[var(--text-primary)] font-medium">
        {getValue<string>()}
      </span>
    ),
  },
  { accessorKey: "tenant", header: "Tenant" },
  {
    accessorKey: "actor",
    header: "Actor",
    cell: ({ getValue }) => (
      <span className="max-w-[180px] truncate block">{getValue<string>()}</span>
    ),
  },
  { accessorKey: "targetUser", header: "Target User" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => {
      const status = getValue<string>();
      const colorClass =
        status === "SUCCESS"
          ? "bg-[var(--success)]/15 text-[var(--success)]"
          : status === "FAILED"
            ? "bg-[var(--error)]/15 text-[var(--error)]"
            : "bg-[var(--accent)]/15 text-[var(--accent)]";
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md ${colorClass}`}
        >
          {status}
        </span>
      );
    },
  },
  { accessorKey: "duration", header: "Duration" },
  {
    accessorKey: "ticket",
    header: "Ticket #",
    cell: ({ getValue }) => (
      <span className="font-mono text-[var(--text-muted)]">
        {getValue<string>() || "\u2014"}
      </span>
    ),
  },
];

const securityColumns: ColumnDef<SecurityRow, unknown>[] = [
  { accessorKey: "tenant", header: "Tenant" },
  { accessorKey: "enabledPolicies", header: "Enabled Policies" },
  { accessorKey: "enabledUsers", header: "Enabled Users" },
  { accessorKey: "disabledUsers", header: "Disabled Users" },
  {
    accessorKey: "healthScore",
    header: "Health Score",
    cell: ({ getValue }) => {
      const score = getValue<number>();
      const color =
        score >= 70
          ? "text-[var(--success)]"
          : score >= 40
            ? "text-[var(--warning)]"
            : "text-[var(--error)]";
      return <span className={`font-bold ${color}`}>{score}</span>;
    },
  },
];

const techPermColumns: ColumnDef<TechPermRow, unknown>[] = [
  {
    accessorKey: "technician",
    header: "Technician",
    cell: ({ getValue }) => (
      <span className="text-[var(--text-primary)] font-medium">
        {getValue<string>()}
      </span>
    ),
  },
  { accessorKey: "email", header: "Email" },
  {
    accessorKey: "permission",
    header: "Permission",
    cell: ({ getValue }) => (
      <span className="font-mono text-xs">{getValue<string>()}</span>
    ),
  },
  { accessorKey: "description", header: "Description" },
];

// ---------- Helper maps ----------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const columnsMap: Record<ReportType, ColumnDef<any, unknown>[]> = {
  licenses: licenseColumns,
  health: healthColumns,
  "task-runs": taskRunColumns,
  security: securityColumns,
  "tech-permissions": techPermColumns,
};

const filenameMap: Record<ReportType, string> = {
  licenses: "license-report",
  health: "health-report",
  "task-runs": "task-runs-report",
  security: "security-report",
  "tech-permissions": "tech-permissions-report",
};

const labelMap: Record<ReportType, string> = {
  licenses: "License Report",
  health: "Health Summary Report",
  "task-runs": "Task Runs Report",
  security: "Security Posture Report",
  "tech-permissions": "Tech Permissions Report",
};

const headersMap: Record<ReportType, string[]> = {
  licenses: ["Tenant", "SKU", "Total", "Consumed", "Available", "Utilization"],
  health: ["Tenant", "Score", "Users (0-40)", "Licenses (0-30)", "Policies (0-30)"],
  "task-runs": ["Date", "Task", "Tenant", "Actor", "Target User", "Status", "Duration", "Ticket #"],
  security: ["Tenant", "Enabled Policies", "Enabled Users", "Disabled Users", "Health Score"],
  "tech-permissions": ["Technician", "Email", "Permission", "Description"],
};

const keysMap: Record<ReportType, string[]> = {
  licenses: ["tenant", "sku", "total", "consumed", "available", "utilization"],
  health: ["tenant", "score", "users", "licenses", "policies"],
  "task-runs": ["date", "task", "tenant", "actor", "targetUser", "status", "duration", "ticket"],
  security: ["tenant", "enabledPolicies", "enabledUsers", "disabledUsers", "healthScore"],
  "tech-permissions": ["technician", "email", "permission", "description"],
};

// ---------- Component ----------

export function ReportSelector() {
  const [reportType, setReportType] = useState<ReportType>("licenses");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any[]>([]);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setData([]);
    setGenerated(false);

    try {
      let url = `/api/reports/${reportType}`;
      if (reportType === "task-runs") {
        const params = new URLSearchParams();
        if (dateFrom) params.set("from", dateFrom);
        if (dateTo) params.set("to", dateTo);
        const qs = params.toString();
        if (qs) url += `?${qs}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      setData(json);
      setGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }

  async function exportPdf() {
    setPdfLoading(true);
    try {
      const keys = keysMap[reportType];
      const rows = data.map((row: Record<string, unknown>) =>
        keys.map((k) => String(row[k] ?? ""))
      );
      const blob = await pdf(
        <ReportPdf
          title={labelMap[reportType]}
          headers={headersMap[reportType]}
          rows={rows}
          generatedAt={new Date().toLocaleString()}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filenameMap[reportType]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex flex-wrap items-end gap-4">
          {/* Report type dropdown */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value as ReportType);
                setGenerated(false);
                setData([]);
                setError("");
              }}
              className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              {reportOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date range — only for task-runs */}
          {reportType === "task-runs" && (
            <>
              <div className="min-w-[160px]">
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                  From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div className="min-w-[160px]">
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                  To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-[var(--accent)] text-white text-sm font-medium rounded-lg hover:bg-[var(--accent)]/80 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileBarChart className="w-4 h-4" />
            )}
            Generate
          </button>

          {generated && data.length > 0 && (
            <button
              onClick={exportPdf}
              disabled={pdfLoading}
              className="flex items-center gap-2 px-5 py-2 bg-[var(--bg-hover)] text-[var(--text-primary)] text-sm font-medium rounded-lg hover:bg-[var(--border)] disabled:opacity-50 transition-colors"
            >
              {pdfLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              Export PDF
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-xl px-4 py-3 text-sm text-[var(--error)]">
          {error}
        </div>
      )}

      {/* Results */}
      {generated && (
        <DataTable
          columns={columnsMap[reportType]}
          data={data}
          searchable
          searchPlaceholder="Filter results..."
          exportable
          exportFilename={filenameMap[reportType]}
          pageSize={25}
        />
      )}

      {/* Empty state before generating */}
      {!generated && !loading && !error && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-[var(--bg-hover)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileBarChart className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            Select a report and click Generate
          </h3>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
            Choose a report type from the dropdown above to preview the data.
            You can export the results as CSV.
          </p>
        </div>
      )}
    </div>
  );
}
