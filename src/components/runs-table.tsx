"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";

export interface TaskRunRow {
  id: number;
  startedAt: string;
  actor: string;
  taskName: string;
  targetUser: string | null;
  tenantAbbrv: string;
  status: string;
  durationMs: number | null;
  ticketNumber: string | null;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

const columns: ColumnDef<TaskRunRow, unknown>[] = [
  {
    accessorKey: "startedAt",
    header: "Started At",
    cell: ({ getValue }) => (
      <span className="whitespace-nowrap text-[var(--text-muted)]">
        {getValue<string>()}
      </span>
    ),
  },
  {
    accessorKey: "actor",
    header: "Actor",
    cell: ({ getValue }) => (
      <span className="max-w-[200px] truncate block">
        {getValue<string>()}
      </span>
    ),
  },
  {
    accessorKey: "taskName",
    header: "Task Name",
    cell: ({ getValue }) => (
      <span className="text-[var(--text-primary)] font-medium">
        {getValue<string>()}
      </span>
    ),
  },
  {
    accessorKey: "targetUser",
    header: "Target User",
    cell: ({ getValue }) => (getValue<string | null>()) ?? "\u2014",
  },
  {
    accessorKey: "tenantAbbrv",
    header: "Tenant",
    cell: ({ getValue }) => (
      <span className="font-mono">{getValue<string>()}</span>
    ),
  },
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
    enableGlobalFilter: false,
  },
  {
    accessorKey: "durationMs",
    header: "Duration",
    cell: ({ getValue }) => {
      const val = getValue<number | null>();
      return (
        <span className="whitespace-nowrap text-[var(--text-muted)]">
          {val != null ? formatDuration(val) : "\u2014"}
        </span>
      );
    },
    enableGlobalFilter: false,
  },
  {
    accessorKey: "ticketNumber",
    header: "Ticket #",
    cell: ({ getValue }) => (
      <span className="font-mono text-[var(--text-muted)]">
        {(getValue<string | null>()) ?? "\u2014"}
      </span>
    ),
  },
];

export function RunsTable({ data }: { data: TaskRunRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchable
      searchPlaceholder="Filter runs..."
      exportable
      exportFilename="task-runs"
      pageSize={25}
    />
  );
}
