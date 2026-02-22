"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FolderTree,
  Monitor,
  Server,
  Loader2,
  AlertTriangle,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type {
  SophosEndpointGroup,
  SophosEndpoint,
  SophosEndpointListResponse,
} from "@/lib/types/sophos";
import {
  sophosEndpointTypeLabel,
  formatSophosTime,
} from "@/lib/sophos-utils";
import { SophosHealthBadge } from "@/components/sophos-health-badge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  groupId: string;
  tenantId: number;
  role: string;
}

const PAGE_SIZE = 50;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SophosGroupDetail({ groupId, tenantId, role }: Props) {
  const router = useRouter();

  // Group info state
  const [group, setGroup] = useState<SophosEndpointGroup | null>(null);
  const [groupLoading, setGroupLoading] = useState(true);
  const [groupError, setGroupError] = useState<string | null>(null);

  // Endpoints state
  const [endpoints, setEndpoints] = useState<SophosEndpoint[]>([]);
  const [endpointsLoading, setEndpointsLoading] = useState(true);
  const [endpointsError, setEndpointsError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch group detail
  const fetchGroup = useCallback(async () => {
    setGroupLoading(true);
    setGroupError(null);

    try {
      const res = await fetch(
        `/api/sophos/groups/${groupId}?tenantId=${tenantId}`,
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error || `Failed to fetch group (${res.status})`,
        );
      }
      const data: SophosEndpointGroup = await res.json();
      setGroup(data);
    } catch (err) {
      setGroupError(
        err instanceof Error ? err.message : "Failed to fetch group",
      );
    } finally {
      setGroupLoading(false);
    }
  }, [groupId, tenantId]);

  // Fetch group endpoints
  const fetchEndpoints = useCallback(async () => {
    setEndpointsLoading(true);
    setEndpointsError(null);

    const qs = new URLSearchParams();
    qs.set("tenantId", String(tenantId));
    qs.set("pageSize", String(PAGE_SIZE));
    qs.set("page", String(page));

    try {
      const res = await fetch(
        `/api/sophos/groups/${groupId}/endpoints?${qs.toString()}`,
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error || `Failed to fetch group endpoints (${res.status})`,
        );
      }
      const data: SophosEndpointListResponse = await res.json();
      setEndpoints(data.items ?? []);
      setTotalPages(data.pages?.total ?? 1);
    } catch (err) {
      setEndpointsError(
        err instanceof Error ? err.message : "Failed to fetch endpoints",
      );
      setEndpoints([]);
    } finally {
      setEndpointsLoading(false);
    }
  }, [groupId, tenantId, page]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  useEffect(() => {
    fetchEndpoints();
  }, [fetchEndpoints]);

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (groupLoading) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
        <span className="ml-2 text-sm text-[var(--text-secondary)]">
          Loading group...
        </span>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  if (groupError) {
    return (
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
            {groupError}
          </p>
        </div>
      </div>
    );
  }

  if (!group) return null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Group info header */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center shrink-0">
            <FolderTree
              className="w-6 h-6"
              style={{ color: "var(--accent)" }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-[var(--text-primary)] truncate">
                {group.name}
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 shrink-0">
                {group.type === "server" ? (
                  <Server className="w-3 h-3" />
                ) : (
                  <Monitor className="w-3 h-3" />
                )}
                {group.type === "server" ? "Server" : "Computer"}
              </span>
            </div>
            {group.description && (
              <p className="text-sm text-[var(--text-secondary)] mb-2">
                {group.description}
              </p>
            )}
            <p className="text-xs text-[var(--text-muted)]">
              {group.endpoints?.itemsCount ?? 0} endpoint
              {(group.endpoints?.itemsCount ?? 0) !== 1 ? "s" : ""} in this
              group
            </p>
          </div>
        </div>
      </div>

      {/* Endpoints error banner */}
      {endpointsError && (
        <div className="flex items-start gap-3 p-4 bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-xl">
          <AlertTriangle
            className="w-5 h-5 mt-0.5 shrink-0"
            style={{ color: "var(--error)" }}
          />
          <div>
            <p className="text-sm font-medium text-[var(--error)]">
              Failed to load endpoints
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {endpointsError}
            </p>
          </div>
        </div>
      )}

      {/* Endpoints loading */}
      {endpointsLoading && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
          <span className="ml-2 text-sm text-[var(--text-secondary)]">
            Loading endpoints...
          </span>
        </div>
      )}

      {/* Endpoints table */}
      {!endpointsLoading && (
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
                </tr>
              </thead>
              <tbody>
                {endpoints.map((ep) => (
                  <tr
                    key={ep.id}
                    onClick={() =>
                      router.push(
                        `/dashboard/sophos/endpoints/${ep.id}?tenantId=${tenantId}`,
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
                  </tr>
                ))}
                {endpoints.length === 0 && !endpointsError && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-sm text-[var(--text-muted)]"
                    >
                      <Shield
                        className="w-8 h-8 mx-auto mb-2"
                        style={{ color: "var(--text-muted)" }}
                      />
                      No endpoints in this group
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
                {Array.from(
                  { length: Math.min(totalPages, 7) },
                  (_, i) => {
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
                  },
                )}
              </div>

              <button
                onClick={() =>
                  setPage((p) => Math.min(totalPages, p + 1))
                }
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
