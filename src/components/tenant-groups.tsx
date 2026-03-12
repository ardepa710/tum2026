"use client";

import { useState, useRef, useCallback } from "react";
import {
  UsersRound,
  ChevronDown,
  Loader2,
  AlertTriangle,
  Building2,
  Search,
  Shield,
  Mail,
  Users,
} from "lucide-react";
import { GroupDetailPanel } from "@/components/group-detail-panel";

type ADGroup = {
  id: number;
  samAccountName: string;
  displayName: string;
  description: string | null;
  groupCategory: string;
  groupScope: string;
  memberCount: number;
};

type TenantOption = {
  id: number;
  tenantName: string;
  tenantAbbrv: string;
};

type SelectedGroup = {
  sam: string;
  displayName: string;
};

export function TenantGroups({ tenants }: { tenants: TenantOption[] }) {
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [groups, setGroups] = useState<ADGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<SelectedGroup | null>(null);
  const fetchIdRef = useRef(0);

  const handleTenantChange = useCallback(async (tenantId: string) => {
    setSelectedTenantId(tenantId);
    setFilter("");

    if (!tenantId) {
      setGroups([]);
      setError(null);
      return;
    }

    const currentFetchId = ++fetchIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tenants/${tenantId}/ad/groups`);
      if (currentFetchId !== fetchIdRef.current) return;

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch groups");
      }

      const data = await res.json();
      if (currentFetchId !== fetchIdRef.current) return;
      setGroups(data);
    } catch (e) {
      if (currentFetchId !== fetchIdRef.current) return;
      setError(e instanceof Error ? e.message : "Failed to fetch groups");
      setGroups([]);
    } finally {
      if (currentFetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const filteredGroups = filter
    ? groups.filter(
        (g) =>
          g.displayName.toLowerCase().includes(filter.toLowerCase()) ||
          g.samAccountName.toLowerCase().includes(filter.toLowerCase()) ||
          (g.description || "").toLowerCase().includes(filter.toLowerCase())
      )
    : groups;

  const selectedTenant = tenants.find((t) => String(t.id) === selectedTenantId);

  const selectClass =
    "w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors appearance-none cursor-pointer";

  return (
    <div className="space-y-5">
      {/* Tenant Selector */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <select
            value={selectedTenantId}
            onChange={(e) => handleTenantChange(e.target.value)}
            className={selectClass}
          >
            <option value="">Select a tenant...</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.tenantName} ({t.tenantAbbrv})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
        </div>

        {groups.length > 0 && !loading && (
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
            <input
              type="text"
              placeholder="Filter groups..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>
        )}
      </div>

      {/* Empty states */}
      {!selectedTenantId && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-14 h-14 bg-[var(--bg-hover)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7 text-[var(--text-muted)]" />
          </div>
          <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Select a Tenant</h4>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
            Choose a tenant from the dropdown above to view its Active Directory groups.
          </p>
        </div>
      )}

      {loading && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin mx-auto mb-4" />
          <p className="text-sm text-[var(--text-secondary)]">
            Loading groups for {selectedTenant?.tenantName}...
          </p>
        </div>
      )}

      {error && !loading && (
        <div className="bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-[var(--error)]" />
            <div>
              <p className="text-sm font-medium text-[var(--error)]">Failed to load groups</p>
              <p className="text-xs text-[var(--error)]/70 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && selectedTenantId && groups.length === 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-14 h-14 bg-[var(--warning)]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UsersRound className="w-7 h-7 text-[var(--warning)]" />
          </div>
          <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Groups Found</h4>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
            No Active Directory groups synced for this tenant. Run the nightly AD sync first.
          </p>
        </div>
      )}

      {/* Groups table */}
      {!loading && !error && groups.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UsersRound className="w-5 h-5" style={{ color: "var(--accent)" }} />
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {selectedTenant?.tenantName}
              </span>
            </div>
            <span className="text-sm text-[var(--text-muted)]">
              {filteredGroups.length === groups.length
                ? `${groups.length} group${groups.length !== 1 ? "s" : ""}`
                : `${filteredGroups.length} of ${groups.length} groups`}
            </span>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                      Group Name
                    </th>
                    <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                      Description
                    </th>
                    <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                      Type / Scope
                    </th>
                    <th className="text-center text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                      Members
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredGroups.map((group) => (
                    <tr
                      key={group.id}
                      onClick={() =>
                        setSelectedGroup({
                          sam: group.samAccountName,
                          displayName: group.displayName,
                        })
                      }
                      className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {group.displayName}
                        </p>
                        <p className="text-xs font-mono text-[var(--text-muted)]">
                          {group.samAccountName}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-[var(--text-secondary)] line-clamp-2">
                          {group.description || "\u2014"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-fit ${
                              group.groupCategory === "Security"
                                ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                                : "bg-[var(--success)]/10 text-[var(--success)]"
                            }`}
                          >
                            {group.groupCategory === "Security" ? (
                              <Shield className="w-3 h-3" />
                            ) : (
                              <Mail className="w-3 h-3" />
                            )}
                            {group.groupCategory}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">{group.groupScope}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span
                          className={`text-sm font-semibold ${
                            group.memberCount === 0
                              ? "text-[var(--warning)]"
                              : "text-[var(--text-primary)]"
                          }`}
                        >
                          {group.memberCount}
                        </span>
                        {group.memberCount === 0 && (
                          <p className="text-[10px] text-[var(--warning)]">empty</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Group Detail Panel */}
      {selectedGroup && selectedTenantId && (
        <GroupDetailPanel
          tenantId={selectedTenantId}
          groupSam={selectedGroup.sam}
          groupName={selectedGroup.displayName}
          onClose={() => setSelectedGroup(null)}
        />
      )}
    </div>
  );
}
