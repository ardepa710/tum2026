"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Link2,
  Unlink,
  RefreshCw,
  CheckSquare,
  Square,
  ArrowLeftRight,
  Info,
} from "lucide-react";
import {
  deleteCrossLink,
  bulkCreateCrossLinks,
} from "@/app/dashboard/sophos/cross-links/actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CrossLink = {
  id: number;
  tenantId: number;
  ninjaDeviceId: number;
  ninjaDeviceName: string;
  sophosEndpointId: string;
  sophosEndpointName: string;
  linkedAt: string;
  linkedBy: string;
};

type Suggestion = {
  ninjaDeviceId: number;
  ninjaDeviceName: string;
  sophosEndpointId: string;
  sophosEndpointName: string;
};

type Tenant = {
  id: number;
  tenantName: string;
  tenantAbbrv: string;
  ninjaOrgId: number | null;
  sophosOrgId: string | null;
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function CrossLinkManager({ tenants }: { tenants: Tenant[] }) {
  // Only show tenants with both integrations linked
  const eligibleTenants = tenants.filter(
    (t) => t.ninjaOrgId !== null && t.sophosOrgId !== null,
  );

  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [crossLinks, setCrossLinks] = useState<CrossLink[] | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-match state
  const [autoMatchSuggestions, setAutoMatchSuggestions] = useState<
    Suggestion[] | null
  >(null);
  const [autoMatchLoading, setAutoMatchLoading] = useState(false);
  const [autoMatchError, setAutoMatchError] = useState<string | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(
    new Set(),
  );
  const [bulkCreating, setBulkCreating] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Unlink state (track per-row)
  const [unlinkingId, setUnlinkingId] = useState<number | null>(null);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch cross-links when tenant changes
  // ---------------------------------------------------------------------------

  const fetchCrossLinks = useCallback(async (tenantId: number) => {
    setLoading(true);
    setError(null);
    setCrossLinks(undefined);
    setAutoMatchSuggestions(null);
    setSelectedSuggestions(new Set());
    setAutoMatchError(null);
    setBulkError(null);
    setUnlinkError(null);

    try {
      const res = await fetch(`/api/cross-links?tenantId=${tenantId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch cross-links");
      }
      const data: CrossLink[] = await res.json();
      setCrossLinks(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch cross-links";
      setError(message);
      setCrossLinks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTenantId !== null) {
      fetchCrossLinks(selectedTenantId);
    } else {
      setCrossLinks(undefined);
      setAutoMatchSuggestions(null);
      setSelectedSuggestions(new Set());
    }
  }, [selectedTenantId, fetchCrossLinks]);

  // ---------------------------------------------------------------------------
  // Auto-match
  // ---------------------------------------------------------------------------

  const handleAutoMatch = async () => {
    if (selectedTenantId === null) return;
    setAutoMatchLoading(true);
    setAutoMatchError(null);
    setAutoMatchSuggestions(null);
    setSelectedSuggestions(new Set());
    setBulkError(null);

    try {
      const res = await fetch("/api/cross-links/auto-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: selectedTenantId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Auto-match failed");
      }

      const data: { suggestions: Suggestion[] } = await res.json();
      setAutoMatchSuggestions(data.suggestions);

      // Select all by default
      setSelectedSuggestions(
        new Set(data.suggestions.map((_, i) => i)),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Auto-match failed";
      setAutoMatchError(message);
    } finally {
      setAutoMatchLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Bulk create
  // ---------------------------------------------------------------------------

  const handleBulkCreate = async () => {
    if (
      selectedTenantId === null ||
      !autoMatchSuggestions ||
      selectedSuggestions.size === 0
    )
      return;

    setBulkCreating(true);
    setBulkError(null);

    const matches = autoMatchSuggestions.filter((_, i) =>
      selectedSuggestions.has(i),
    );

    const result = await bulkCreateCrossLinks(selectedTenantId, matches);

    if (result.success) {
      // Refresh cross-links and clear suggestions
      setAutoMatchSuggestions(null);
      setSelectedSuggestions(new Set());
      await fetchCrossLinks(selectedTenantId);
    } else {
      setBulkError(result.error);
    }

    setBulkCreating(false);
  };

  // ---------------------------------------------------------------------------
  // Unlink single cross-link
  // ---------------------------------------------------------------------------

  const handleUnlink = async (crossLinkId: number) => {
    setUnlinkingId(crossLinkId);
    setUnlinkError(null);

    const result = await deleteCrossLink(crossLinkId);

    if (result.success) {
      setCrossLinks((prev) =>
        prev ? prev.filter((cl) => cl.id !== crossLinkId) : prev,
      );
    } else {
      setUnlinkError(result.error);
    }

    setUnlinkingId(null);
  };

  // ---------------------------------------------------------------------------
  // Suggestion selection helpers
  // ---------------------------------------------------------------------------

  const toggleSuggestion = (index: number) => {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleAllSuggestions = () => {
    if (!autoMatchSuggestions) return;
    if (selectedSuggestions.size === autoMatchSuggestions.length) {
      setSelectedSuggestions(new Set());
    } else {
      setSelectedSuggestions(
        new Set(autoMatchSuggestions.map((_, i) => i)),
      );
    }
  };

  // ---------------------------------------------------------------------------
  // No eligible tenants
  // ---------------------------------------------------------------------------

  if (eligibleTenants.length === 0) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[var(--accent)] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              No eligible tenants
            </p>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Cross-linking requires tenants with both a NinjaOne organization
              and a Sophos Central tenant linked. Link your tenants to both
              platforms first.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Header with tenant selector + auto-match button */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between gap-3 flex-wrap">
        <select
          value={selectedTenantId ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            setSelectedTenantId(val ? Number(val) : null);
          }}
          className="text-sm px-2.5 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
        >
          <option value="">-- Select Tenant --</option>
          {eligibleTenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.tenantAbbrv} - {t.tenantName}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          {selectedTenantId !== null && (
            <>
              <button
                onClick={() => fetchCrossLinks(selectedTenantId)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3 h-3 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
              <button
                onClick={handleAutoMatch}
                disabled={autoMatchLoading || loading}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors disabled:opacity-50"
              >
                {autoMatchLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <ArrowLeftRight className="w-3 h-3" />
                )}
                Auto-Match by Hostname
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="p-4">
        {/* No tenant selected */}
        {selectedTenantId === null && (
          <p className="text-sm text-[var(--text-muted)] text-center py-8">
            Select a tenant to manage cross-links.
          </p>
        )}

        {/* Loading */}
        {selectedTenantId !== null && loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
            <span className="ml-2 text-sm text-[var(--text-secondary)]">
              Loading cross-links...
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-[var(--error)] mb-4">{error}</p>
        )}

        {/* Cross-links loaded */}
        {selectedTenantId !== null && !loading && crossLinks !== undefined && (
          <>
            {/* Summary */}
            <div className="mb-4">
              <span className="text-xs text-[var(--text-muted)]">
                {crossLinks.length} device
                {crossLinks.length !== 1 ? "s" : ""} linked
              </span>
            </div>

            {/* Unlink error */}
            {unlinkError && (
              <p className="text-xs text-[var(--error)] mb-3">
                {unlinkError}
              </p>
            )}

            {/* Linked devices table */}
            {crossLinks.length > 0 ? (
              <div className="border border-[var(--border)] rounded-lg overflow-hidden mb-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--bg-primary)]">
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                          NinjaOne Device
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                          Sophos Endpoint
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                          Linked
                        </th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {crossLinks.map((cl) => (
                        <tr
                          key={cl.id}
                          className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-hover)] transition-colors"
                        >
                          <td className="px-4 py-2.5">
                            <span className="text-sm text-[var(--text-primary)]">
                              {cl.ninjaDeviceName}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-sm text-[var(--text-primary)]">
                              {cl.sophosEndpointName}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <div>
                              <span className="text-xs text-[var(--text-secondary)]">
                                {new Date(cl.linkedAt).toLocaleDateString()}
                              </span>
                              <span className="text-xs text-[var(--text-muted)] ml-1">
                                by {cl.linkedBy}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              onClick={() => handleUnlink(cl.id)}
                              disabled={unlinkingId === cl.id}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-[var(--error)]/10 text-[var(--error)] hover:bg-[var(--error)]/20 transition-colors disabled:opacity-50"
                            >
                              {unlinkingId === cl.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Unlink className="w-3 h-3" />
                              )}
                              Unlink
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 mb-4 border border-dashed border-[var(--border)] rounded-lg">
                <Link2 className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-2" />
                <p className="text-sm text-[var(--text-muted)]">
                  No cross-links yet.
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Use &quot;Auto-Match by Hostname&quot; to find matching
                  devices.
                </p>
              </div>
            )}

            {/* Auto-match error */}
            {autoMatchError && (
              <p className="text-xs text-[var(--error)] mb-3">
                {autoMatchError}
              </p>
            )}

            {/* Auto-match suggestions panel */}
            {autoMatchSuggestions !== null && (
              <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                {/* Suggestions header */}
                <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-primary)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleAllSuggestions}
                      disabled={
                        autoMatchSuggestions.length === 0 || bulkCreating
                      }
                      className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
                    >
                      {autoMatchSuggestions.length > 0 &&
                      selectedSuggestions.size ===
                        autoMatchSuggestions.length ? (
                        <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    <span className="text-xs text-[var(--text-muted)]">
                      Found {autoMatchSuggestions.length} match
                      {autoMatchSuggestions.length !== 1 ? "es" : ""}
                    </span>
                  </div>
                  {autoMatchSuggestions.length > 0 && (
                    <button
                      onClick={handleBulkCreate}
                      disabled={
                        selectedSuggestions.size === 0 || bulkCreating
                      }
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20 transition-colors disabled:opacity-50"
                    >
                      {bulkCreating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Link2 className="w-3 h-3" />
                      )}
                      Confirm &amp; Link Selected ({selectedSuggestions.size})
                    </button>
                  )}
                </div>

                {/* Bulk error */}
                {bulkError && (
                  <div className="px-4 py-2 border-b border-[var(--border)]">
                    <p className="text-xs text-[var(--error)]">{bulkError}</p>
                  </div>
                )}

                {/* Suggestions list */}
                {autoMatchSuggestions.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm text-[var(--text-muted)]">
                      No auto-match suggestions found.
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      All devices may already be linked, or hostnames do not
                      match.
                    </p>
                  </div>
                ) : (
                  <div>
                    {autoMatchSuggestions.map((suggestion, index) => (
                      <div
                        key={`${suggestion.ninjaDeviceId}-${suggestion.sophosEndpointId}`}
                        className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-hover)] transition-colors"
                      >
                        <button
                          onClick={() => toggleSuggestion(index)}
                          disabled={bulkCreating}
                          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
                        >
                          {selectedSuggestions.has(index) ? (
                            <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-sm text-[var(--text-primary)] truncate">
                            {suggestion.ninjaDeviceName}
                          </span>
                          <ArrowLeftRight className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                          <span className="text-sm text-[var(--text-primary)] truncate">
                            {suggestion.sophosEndpointName}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
