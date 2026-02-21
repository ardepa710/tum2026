"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  ChevronDown,
  Loader2,
  Monitor,
  AlertTriangle,
} from "lucide-react";
import type {
  NinjaDevice,
  NinjaOrganization,
  NinjaNodeClass,
} from "@/lib/types/ninja";
import { nodeClassColor, nodeClassLabel, formatNinjaTime } from "@/lib/ninja-utils";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NinjaDeviceTable() {
  const [devices, setDevices] = useState<NinjaDevice[]>([]);
  const [organizations, setOrganizations] = useState<NinjaOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [orgFilter, setOrgFilter] = useState<number | "all">("all");
  const [typeFilter, setTypeFilter] = useState<NinjaNodeClass | "all">("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "online" | "offline"
  >("all");

  const PAGE_SIZE = 100;

  // Fetch organizations on mount
  useEffect(() => {
    fetch("/api/ninja/organizations")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setOrganizations(data);
      })
      .catch(() => {
        // Non-critical — org filter just won't have names
      });
  }, []);

  // Fetch devices on mount
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/ninja/devices?pageSize=${PAGE_SIZE}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch devices");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setDevices(data);
          setHasMore(data.length === PAGE_SIZE);
        } else {
          setDevices([]);
          setHasMore(false);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to fetch devices");
      })
      .finally(() => setLoading(false));
  }, []);

  // Load more (cursor-based pagination)
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || devices.length === 0) return;
    setLoadingMore(true);
    const lastId = devices[devices.length - 1].id;
    fetch(`/api/ninja/devices?pageSize=${PAGE_SIZE}&after=${lastId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load more devices");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setDevices((prev) => [...prev, ...data]);
          setHasMore(data.length === PAGE_SIZE);
        } else {
          setHasMore(false);
        }
      })
      .catch(() => {
        setHasMore(false);
      })
      .finally(() => setLoadingMore(false));
  }, [devices, hasMore, loadingMore]);

  // Build org lookup
  const orgMap = new Map(organizations.map((o) => [o.id, o.name]));

  // Get unique node classes from devices for the type filter dropdown
  const uniqueNodeClasses = Array.from(
    new Set(devices.map((d) => d.nodeClass).filter(Boolean)),
  ) as NinjaNodeClass[];

  // Apply client-side filters
  const filtered = devices.filter((d) => {
    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const name = (d.displayName || d.systemName || "").toLowerCase();
      const orgName = (
        d.references?.organization?.name ||
        orgMap.get(d.organizationId) ||
        ""
      ).toLowerCase();
      if (!name.includes(term) && !orgName.includes(term)) return false;
    }

    // Org filter
    if (orgFilter !== "all" && d.organizationId !== orgFilter) return false;

    // Type filter
    if (typeFilter !== "all" && d.nodeClass !== typeFilter) return false;

    // Status filter
    if (statusFilter === "online" && d.offline !== false) return false;
    if (statusFilter === "offline" && d.offline !== true) return false;

    return true;
  });

  // Stats
  const onlineCount = filtered.filter((d) => d.offline === false).length;
  const offlineCount = filtered.filter((d) => d.offline === true).length;

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
              NinjaOne API Error
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
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search devices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>

          {/* Org filter */}
          <div className="relative">
            <select
              value={orgFilter === "all" ? "all" : String(orgFilter)}
              onChange={(e) =>
                setOrgFilter(
                  e.target.value === "all" ? "all" : Number(e.target.value),
                )
              }
              className="appearance-none pl-3 pr-8 py-2 text-sm bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors cursor-pointer"
            >
              <option value="all">All Organizations</option>
              {organizations.map((org) => (
                <option key={org.id} value={String(org.id)}>
                  {org.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
          </div>

          {/* Type filter */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(
                  e.target.value === "all"
                    ? "all"
                    : (e.target.value as NinjaNodeClass),
                )
              }
              className="appearance-none pl-3 pr-8 py-2 text-sm bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors cursor-pointer"
            >
              <option value="all">All Types</option>
              {uniqueNodeClasses.map((nc) => (
                <option key={nc} value={nc}>
                  {nodeClassLabel(nc)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
          </div>

          {/* Status toggle */}
          <div className="flex items-center bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg overflow-hidden">
            {(["all", "online", "offline"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {s === "all"
                  ? "All"
                  : s === "online"
                    ? `Online (${onlineCount})`
                    : `Offline (${offlineCount})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
          <span className="ml-2 text-sm text-[var(--text-secondary)]">
            Loading devices...
          </span>
        </div>
      )}

      {/* Devices table */}
      {!loading && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {filtered.length} device{filtered.length !== 1 ? "s" : ""}
              {filtered.length !== devices.length &&
                ` (of ${devices.length} total)`}
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Last Contact
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((device) => {
                  const name =
                    device.displayName || device.systemName || "Unknown";
                  const isOnline = device.offline === false;
                  const orgName =
                    device.references?.organization?.name ||
                    orgMap.get(device.organizationId) ||
                    `Org #${device.organizationId}`;

                  return (
                    <tr
                      key={device.id}
                      className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/rmm/devices/${device.id}`}
                          className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
                        >
                          {name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                        {orgName}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${nodeClassColor(device.nodeClass)}`}
                        >
                          {nodeClassLabel(device.nodeClass)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span
                            className={`w-2 h-2 rounded-full ${isOnline ? "bg-[var(--success)]" : "bg-[var(--error)]"}`}
                          />
                          <span
                            className={
                              isOnline
                                ? "text-[var(--success)]"
                                : "text-[var(--error)]"
                            }
                          >
                            {isOnline ? "Online" : "Offline"}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                        {formatNinjaTime(device.lastContact)}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && !error && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-[var(--text-muted)]"
                    >
                      <Monitor
                        className="w-8 h-8 mx-auto mb-2"
                        style={{ color: "var(--text-muted)" }}
                      />
                      {devices.length === 0
                        ? "No devices found."
                        : "No devices match your filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Load more */}
          {hasMore && !loading && (
            <div className="px-4 py-3 border-t border-[var(--border)] flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load more devices"
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
