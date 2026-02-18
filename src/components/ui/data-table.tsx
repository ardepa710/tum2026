"use client";

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Columns3,
} from "lucide-react";

interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  exportable?: boolean;
  exportFilename?: string;
}

export function DataTable<T>({
  columns,
  data,
  searchable = false,
  searchPlaceholder = "Search...",
  pageSize = 25,
  exportable = false,
  exportFilename = "export",
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState({});
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  function exportCsv() {
    const visibleColumns = table.getVisibleFlatColumns();
    const headers = visibleColumns.map((col) => col.id);
    const rows = table.getFilteredRowModel().rows.map((row) =>
      visibleColumns.map((col) => {
        const val = row.getValue(col.id);
        const str = String(val ?? "");
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      })
    );
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportFilename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Toolbar */}
      {(searchable || exportable) && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            {searchable && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="pl-9 pr-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] w-48 sm:w-64"
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors"
                title="Toggle columns"
              >
                <Columns3 className="w-4 h-4" />
              </button>
              {showColumnMenu && (
                <div className="absolute right-0 top-full mt-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg p-2 z-10 min-w-[160px]">
                  {table.getAllLeafColumns().map((column) => (
                    <label
                      key={column.id}
                      className="flex items-center gap-2 px-2 py-1 text-xs text-[var(--text-secondary)] cursor-pointer hover:bg-[var(--bg-hover)] rounded"
                    >
                      <input
                        type="checkbox"
                        checked={column.getIsVisible()}
                        onChange={column.getToggleVisibilityHandler()}
                        className="rounded"
                      />
                      {typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}
                    </label>
                  ))}
                </div>
              )}
            </div>
            {exportable && (
              <button
                onClick={exportCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded-lg hover:text-[var(--text-primary)] transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider"
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        className={`flex items-center gap-1.5 ${
                          header.column.getCanSort()
                            ? "cursor-pointer select-none hover:text-[var(--text-primary)]"
                            : ""
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() &&
                          (header.column.getIsSorted() === "asc" ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : header.column.getIsSorted() === "desc" ? (
                            <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          ))}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-[var(--text-muted)]"
                >
                  No data to display.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--text-muted)]">
            Showing{" "}
            {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}–
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{" "}
            of {table.getFilteredRowModel().rows.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-[var(--text-muted)]">
              {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
