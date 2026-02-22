"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Shield,
  AlertTriangle,
} from "lucide-react";
import type { SophosEndpoint, SophosEndpointListResponse } from "@/lib/types/sophos";
import {
  sophosEndpointTypeLabel,
  formatSophosTime,
} from "@/lib/sophos-utils";
import { SophosHealthBadge } from "@/components/sophos-health-badge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  tenants: Array<{
    id: number;
    tenantAbbrv: string;
    sophosOrgId: string | null;
  }>;
  initialTenantId?: number;
  role: string;
}

const PAGE_SIZE = 50;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SophosEndpointTable({
  tenants,
  initialTenantId,
  role,
}: Props) {
  const router = useRouter();

  // State
  const [selectedTenant, setSelectedTenant] = useState<number | undefined>(
    initialTenantId,
  );
  const [endpoints, setEndpoints] = useState<SophosEndpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [healthFilter, setHealthFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [tamperFilter, setTamperFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [healthFilter, typeFilter, tamperFilter, selectedTenant]);

  // Fetch endpoints
  const fetchEndpoints = useCallback(async () => {
    if (!selectedTenant) {
      setEndpoints([]);
      setTotalPages(1);
      return;
    }

    setLoading(true);
    setError(null);

    const qs = new URLSearchParams();
    qs.set("tenantId", String(selectedTenant));
    qs.set("pageSize", String(PAGE_SIZE));
    qs.set("page", String(page));
    if (healthFilter) qs.set("healthStatus", healthFilter);
    if (typeFilter) qs.set("type", typeFilter);
    if (debouncedSearch) qs.set("search", debouncedSearch);
    if (tamperFilter)
      qs.set("tamperProtectionEnabled", tamperFilter);

    try {
      const res = await fetch(`/api/sophos/endpoints?${qs.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error || `Failed to fetch endpoints (${res.status})`,
        );
      }
      const data: SophosEndpointListResponse = await res.json();
      setEndpoints(data.items ?? []);
      setTotalPages(data.pages?.total ?? 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch endpoints",
      );
      setEndpoints([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTenant, page, healthFilter, typeFilter, tamperFilter, debouncedSearch]);

  useEffect(() => {
    fetchEndpoints();
  }, [fetchEndpoints]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-xl">
          <AlertTriangle
            className="w-5 h-5 mt-0.5 shrink-0"
            style={{ color: "var(--error)" }}
          />
          <div>
            <p className="text-sm font-medium text-[var(--error)]">
              Sophos API Error
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Filters bar */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Tenant selector */}
          <div className="relative">
            <select
              value={selectedTenant ?? ""}
              onChange={(e) =>
                setSelectedTenant(
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              className="appearance-none pl-3 pr-8 py-2 text-sm bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors cursor-pointer"
            >
              <option value="">Select Tenant...</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tenantAbbrv}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search by hostname..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={!selectedTenant}
              className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors disabled:opacity-50"
            />
          </div>

          {/* Health filter */}
          <div className="relative">
            <select
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value)}
              disabled={!selectedTenant}
              className="appearance-none pl-3 pr-8 py-2 text-sm bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors cursor-pointer disabled:opacity-50"
            >
              <option value="">All Health</option>
              <option value="good">Healthy</option>
              <option value="suspicious">Suspicious</option>
              <option value="bad">Unhealthy</option>
              <option value="unknown">Unknown</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
          </div>

          {/* Type filter */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              disabled={!selectedTenant}
              className="appearance-none pl-3 pr-8 py-2 text-sm bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors cursor-pointer disabled:opacity-50"
            >
              <option value="">All Types</option>
              <option value="computer">Workstation</option>
              <option value="server">Server</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
          </div>

          {/* Tamper filter */}
          <div className="relative">
            <select
              value={tamperFilter}
              onChange={(e) => setTamperFilter(e.target.value)}
              disabled={!selectedTenant}
              className="appearance-none pl-3 pr-8 py-2 text-sm bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors cursor-pointer disabled:opacity-50"
            >
              <option value="">Tamper: All</option>
              <option value="true">Tamper: On</option>
              <option value="false">Tamper: Off</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* No tenant selected */}
      {!selectedTenant && !loading && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 flex flex-col items-center justify-center">
          <Shield
            className="w-10 h-10 mb-3"
            style={{ color: "var(--text-muted)" }}
          />
          <p className="text-sm text-[var(--text-muted)]">
            Select a tenant to view endpoints
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
          <span className="ml-2 text-sm text-[var(--text-secondary)]">
            Loading endpoints...
          </span>
        </div>
      )}

      {/* Endpoints table */}
      {selectedTenant && !loading && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
          {/* Header row */}
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {endpoints.length} endpoint{endpoints.length !== 1 ? "s" : ""}
              {totalPages > 1 && ` — page ${page} of ${totalPages}`}
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Hostname
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    OS
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Health
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Tamper
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Last Seen
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((ep) => (
                  <tr
                    key={ep.id}
                    onClick={() =>
                      router.push(
                        `/dashboard/sophos/endpoints/${ep.id}?tenantId=${selectedTenant}`,
                      )
                    }
                    className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {ep.hostname || "Unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                        {sophosEndpointTypeLabel(ep.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {ep.os?.name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <SophosHealthBadge health={ep.health?.overall} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            ep.tamperProtectionEnabled
                              ? "bg-[var(--success)]"
                              : "bg-[var(--error)]"
                          }`}
                        />
                        <span
                          className={
                            ep.tamperProtectionEnabled
                              ? "text-[var(--success)]"
                              : "text-[var(--error)]"
                          }
                        >
                          {ep.tamperProtectionEnabled ? "On" : "Off"}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      {formatSophosTime(ep.lastSeenAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {ep.ipv4Addresses?.[0] || "—"}
                    </td>
                  </tr>
                ))}
                {endpoints.length === 0 && !error && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-sm text-[var(--text-muted)]"
                    >
                      <Shield
                        className="w-8 h-8 mx-auto mb-2"
                        style={{ color: "var(--text-muted)" }}
                      />
                      No endpoints found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-[var(--border)] flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (page <= 4) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = page - 3 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${
                        pageNum === page
                          ? "bg-[var(--accent)] text-white"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
