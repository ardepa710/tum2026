"use client";

import { useState, useRef, useCallback } from "react";
import {
  Users,
  ChevronDown,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Search,
} from "lucide-react";
import { UserDetailPanel } from "@/components/user-detail-panel";

type ADUser = {
  id: string;
  displayName: string;
  mail: string | null;
  userPrincipalName: string;
  accountEnabled: boolean;
  jobTitle: string | null;
  department: string | null;
};

type TenantOption = {
  id: number;
  tenantName: string;
  tenantAbbrv: string;
};

export function TenantUsers({ tenants }: { tenants: TenantOption[] }) {
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [users, setUsers] = useState<ADUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    displayName: string;
  } | null>(null);
  const fetchIdRef = useRef(0);

  const handleTenantChange = useCallback(async (tenantId: string) => {
    setSelectedTenantId(tenantId);
    setFilter("");

    if (!tenantId) {
      setUsers([]);
      setError(null);
      return;
    }

    const currentFetchId = ++fetchIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tenants/${tenantId}/users`);
      if (currentFetchId !== fetchIdRef.current) return;

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch users");
      }

      const data = await res.json();
      if (currentFetchId !== fetchIdRef.current) return;
      setUsers(data);
    } catch (e) {
      if (currentFetchId !== fetchIdRef.current) return;
      setError(e instanceof Error ? e.message : "Failed to fetch users");
      setUsers([]);
    } finally {
      if (currentFetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const filteredUsers = filter
    ? users.filter(
        (u) =>
          u.displayName.toLowerCase().includes(filter.toLowerCase()) ||
          (u.mail || u.userPrincipalName).toLowerCase().includes(filter.toLowerCase()) ||
          (u.jobTitle || "").toLowerCase().includes(filter.toLowerCase()) ||
          (u.department || "").toLowerCase().includes(filter.toLowerCase())
      )
    : users;

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

        {/* Search filter - only visible when users loaded */}
        {users.length > 0 && !loading && (
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
            <input
              type="text"
              placeholder="Filter users..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>
        )}
      </div>

      {/* No tenant selected */}
      {!selectedTenantId && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-14 h-14 bg-[var(--bg-hover)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7 text-[var(--text-muted)]" />
          </div>
          <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            Select a Tenant
          </h4>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
            Choose a tenant from the dropdown above to view its Active Directory users.
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin mx-auto mb-4" />
          <p className="text-sm text-[var(--text-secondary)]">
            Loading users for {selectedTenant?.tenantName}...
          </p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-[var(--error)]" />
            <div>
              <p className="text-sm font-medium text-[var(--error)]">
                Failed to load users
              </p>
              <p className="text-xs text-[var(--error)]/70 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* No users found */}
      {!loading && !error && selectedTenantId && users.length === 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-14 h-14 bg-[var(--warning)]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-[var(--warning)]" />
          </div>
          <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            No Users Found
          </h4>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
            No Active Directory users were returned for this tenant. Verify the
            Enterprise App is installed and has the required permissions.
          </p>
        </div>
      )}

      {/* Users table */}
      {!loading && !error && users.length > 0 && (
        <>
          {/* Counter */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5" style={{ color: "var(--accent)" }} />
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {selectedTenant?.tenantName}
              </span>
            </div>
            <span className="text-sm text-[var(--text-muted)]">
              {filteredUsers.length === users.length
                ? `${users.length} user${users.length !== 1 ? "s" : ""}`
                : `${filteredUsers.length} of ${users.length} users`}
            </span>
          </div>

          {/* Table */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                      Display Name
                    </th>
                    <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                      Email / UPN
                    </th>
                    <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                      Job Title
                    </th>
                    <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                      Department
                    </th>
                    <th className="text-center text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() =>
                        setSelectedUser({
                          id: user.id,
                          displayName: user.displayName,
                        })
                      }
                      className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3">
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {user.displayName}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-[var(--text-secondary)]">
                          {user.mail || user.userPrincipalName}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-[var(--text-secondary)]">
                          {user.jobTitle || "\u2014"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-[var(--text-secondary)]">
                          {user.department || "\u2014"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {user.accountEnabled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--success)]/10 text-[var(--success)]">
                            <CheckCircle2 className="w-3 h-3" />
                            Enabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--error)]/10 text-[var(--error)]">
                            <XCircle className="w-3 h-3" />
                            Disabled
                          </span>
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
      {/* User Detail Panel */}
      {selectedUser && selectedTenantId && (
        <UserDetailPanel
          tenantId={selectedTenantId}
          userId={selectedUser.id}
          userName={selectedUser.displayName}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}
