"use client";

import { useState, useActionState, useEffect } from "react";
import {
  linkTenantToSophos,
  unlinkTenantFromSophos,
} from "@/app/dashboard/sophos/settings/actions";
import { Link2, Unlink, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type SophosLinkTableProps = {
  tenants: Array<{
    id: number;
    tenantName: string;
    tenantAbbrv: string;
    sophosOrgId: string | null;
    sophosRegion: string | null;
    sophosApiHost: string | null;
  }>;
  sophosOrgs: Array<{
    id: string;
    name: string;
    dataRegion: string;
    apiHost: string;
  }>;
};

function LinkRow({
  tenant,
  sophosOrgs,
}: {
  tenant: SophosLinkTableProps["tenants"][number];
  sophosOrgs: SophosLinkTableProps["sophosOrgs"];
}) {
  const isLinked = tenant.sophosOrgId !== null;
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState(false);

  const [linkState, linkAction, linkPending] = useActionState(
    linkTenantToSophos,
    { error: "" }
  );
  const [unlinkState, unlinkAction, unlinkPending] = useActionState(
    unlinkTenantFromSophos,
    { error: "" }
  );

  const pending = linkPending || unlinkPending;
  const error = linkState.error || unlinkState.error;

  // Reset selected org when tenant becomes unlinked
  useEffect(() => {
    if (!isLinked) {
      setSelectedOrgId("");
    }
  }, [isLinked]);

  const selectedOrg = sophosOrgs.find((o) => o.id === selectedOrgId);

  // Find the linked org name for display
  const linkedOrgName =
    isLinked
      ? sophosOrgs.find((o) => o.id === tenant.sophosOrgId)?.name ??
        tenant.sophosOrgId
      : null;

  return (
    <tr className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-hover)] transition-colors">
      {/* Tenant */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {tenant.tenantName}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[var(--bg-hover)] text-[var(--text-muted)] rounded">
            {tenant.tenantAbbrv}
          </span>
        </div>
      </td>

      {/* Sophos Organization */}
      <td className="px-4 py-3">
        {isLinked ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text-secondary)]">
              {linkedOrgName}
            </span>
            {tenant.sophosRegion && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[var(--accent)]/10 text-[var(--accent)] rounded">
                {tenant.sophosRegion}
              </span>
            )}
          </div>
        ) : (
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            disabled={pending}
            className="w-full text-sm px-2.5 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
          >
            <option value="">— Select Sophos Tenant —</option>
            {sophosOrgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        {isLinked ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-[var(--success)]/10 text-[var(--success)]">
            <CheckCircle2 className="w-3 h-3" />
            Linked
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-[var(--text-muted)]/10 text-[var(--text-muted)]">
            Not linked
          </span>
        )}
      </td>

      {/* Action */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          {isLinked ? (
            <form action={unlinkAction}>
              <input type="hidden" name="tenantId" value={tenant.id} />
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[var(--error)]/10 text-[var(--error)] hover:bg-[var(--error)]/20 transition-colors disabled:opacity-50"
              >
                {unlinkPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Unlink className="w-3 h-3" />
                )}
                Unlink
              </button>
            </form>
          ) : (
            <form action={linkAction}>
              <input type="hidden" name="tenantId" value={tenant.id} />
              <input
                type="hidden"
                name="sophosOrgId"
                value={selectedOrg?.id ?? ""}
              />
              <input
                type="hidden"
                name="sophosRegion"
                value={selectedOrg?.dataRegion ?? ""}
              />
              <input
                type="hidden"
                name="sophosApiHost"
                value={selectedOrg?.apiHost ?? ""}
              />
              <button
                type="submit"
                disabled={pending || !selectedOrgId}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {linkPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Link2 className="w-3 h-3" />
                )}
                Link
              </button>
            </form>
          )}
          {error && (
            <span className="flex items-center gap-1 text-[10px] text-[var(--error)]">
              <AlertCircle className="w-3 h-3" />
              {error}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

export function SophosLinkTable({ tenants, sophosOrgs }: SophosLinkTableProps) {
  const linkedCount = tenants.filter((t) => t.sophosOrgId !== null).length;

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Summary bar */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <span className="text-xs text-[var(--text-muted)]">
          {linkedCount} of {tenants.length} tenant{tenants.length !== 1 ? "s" : ""} linked
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Tenant
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Sophos Central Tenant
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <LinkRow
                key={tenant.id}
                tenant={tenant}
                sophosOrgs={sophosOrgs}
              />
            ))}
            {tenants.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-sm text-[var(--text-muted)]"
                >
                  No tenants found. Add tenants first to link them to Sophos
                  Central tenants.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
