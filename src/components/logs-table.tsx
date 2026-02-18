"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { ActionBadge } from "@/components/action-badge";

export interface AuditLogRow {
  id: number;
  timestamp: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
}

const columns: ColumnDef<AuditLogRow, unknown>[] = [
  {
    accessorKey: "timestamp",
    header: "Timestamp",
    cell: ({ getValue }) => (
      <span className="whitespace-nowrap">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: "actor",
    header: "Actor",
    cell: ({ getValue }) => (
      <span className="text-[var(--text-secondary)] max-w-[200px] truncate block">
        {getValue<string>()}
      </span>
    ),
  },
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ getValue }) => <ActionBadge action={getValue<string>()} />,
    enableGlobalFilter: false,
  },
  {
    accessorKey: "entity",
    header: "Entity",
    cell: ({ getValue }) => (
      <span className="font-mono text-[var(--text-primary)]">
        {getValue<string>()}
      </span>
    ),
  },
  {
    accessorKey: "entityId",
    header: "ID",
    cell: ({ getValue }) => (
      <span className="font-mono text-[var(--text-muted)]">
        {(getValue<string | null>()) ?? "\u2014"}
      </span>
    ),
  },
  {
    accessorKey: "details",
    header: "Details",
    cell: ({ getValue }) => {
      const val = getValue<string | null>();
      return val ? (
        <code className="text-[10px] bg-[var(--bg-hover)] px-1.5 py-0.5 rounded max-w-[200px] truncate block">
          {val}
        </code>
      ) : (
        <span>{"\u2014"}</span>
      );
    },
  },
];

export function LogsTable({ data }: { data: AuditLogRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchable
      searchPlaceholder="Filter logs..."
      exportable
      exportFilename="audit-logs"
      pageSize={50}
    />
  );
}
