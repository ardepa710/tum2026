"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronDown,
  FolderTree,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import type { SophosEndpointGroup, SophosEndpointGroupListResponse } from "@/lib/types/sophos";
import { SophosGroupCard } from "@/components/sophos-group-card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  tenants: Array<{
    id: number;
    tenantAbbrv: string;
    sophosOrgId: string | null;
  }>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SophosGroupsList({ tenants }: Props) {
  const [selectedTenant, setSelectedTenant] = useState<number | undefined>(
    undefined,
  );
  const [groups, setGroups] = useState<SophosEndpointGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch groups for the selected tenant
  const fetchGroups = useCallback(async () => {
    if (!selectedTenant) {
      setGroups([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/sophos/groups?tenantId=${selectedTenant}`,
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error || `Failed to fetch groups (${res.status})`,
        );
      }
      const data: SophosEndpointGroupListResponse = await res.json();
      setGroups(data.items ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch groups",
      );
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTenant]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Resolve tenantAbbrv for the selected tenant
  const selectedTenantAbbrv =
    tenants.find((t) => t.id === selectedTenant)?.tenantAbbrv ?? "";

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

      {/* Tenant selector */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
        <div className="relative inline-block">
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
      </div>

      {/* No tenant selected */}
      {!selectedTenant && !loading && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 flex flex-col items-center justify-center">
          <FolderTree
            className="w-10 h-10 mb-3"
            style={{ color: "var(--text-muted)" }}
          />
          <p className="text-sm text-[var(--text-muted)]">
            Select a tenant to view endpoint groups
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
          <span className="ml-2 text-sm text-[var(--text-secondary)]">
            Loading groups...
          </span>
        </div>
      )}

      {/* Groups grid */}
      {selectedTenant && !loading && groups.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <SophosGroupCard
              key={group.id}
              group={group}
              tenantId={selectedTenant}
              tenantAbbrv={selectedTenantAbbrv}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {selectedTenant && !loading && groups.length === 0 && !error && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 flex flex-col items-center justify-center">
          <FolderTree
            className="w-10 h-10 mb-3"
            style={{ color: "var(--text-muted)" }}
          />
          <p className="text-sm text-[var(--text-muted)]">
            No endpoint groups found
          </p>
        </div>
      )}
    </div>
  );
}
