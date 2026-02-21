"use client";

import { useState, useActionState, useEffect } from "react";
import {
  linkTenantToNinjaOrg,
  unlinkTenantFromNinjaOrg,
} from "@/app/dashboard/rmm/settings/actions";
import { Link2, Unlink, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type NinjaLinkTableProps = {
  tenants: Array<{
    id: number;
    tenantName: string;
    tenantAbbrv: string;
    ninjaOrgId: number | null;
    ninjaOrgName: string | null;
  }>;
  ninjaOrgs: Array<{
    id: number;
    name: string;
  }>;
};

function LinkRow({
  tenant,
  ninjaOrgs,
}: {
  tenant: NinjaLinkTableProps["tenants"][number];
  ninjaOrgs: NinjaLinkTableProps["ninjaOrgs"];
}) {
  const isLinked = tenant.ninjaOrgId !== null;
  const [selectedOrgId, setSelectedOrgId] = useState<string>(
    tenant.ninjaOrgId?.toString() ?? ""
  );
  const [showSuccess, setShowSuccess] = useState(false);

  const [linkState, linkAction, linkPending] = useActionState(
    linkTenantToNinjaOrg,
    { error: "" }
  );
  const [unlinkState, unlinkAction, unlinkPending] = useActionState(
    unlinkTenantFromNinjaOrg,
    { error: "" }
  );

  const pending = linkPending || unlinkPending;
  const error = linkState.error || unlinkState.error;

  // Show success feedback briefly after a successful action
  useEffect(() => {
    if (
      (linkState.error === "" && !linkPending) ||
      (unlinkState.error === "" && !unlinkPending)
    ) {
      // Only show success if an action was actually submitted (not on initial render)
    }
  }, [linkState.error, unlinkState.error, linkPending, unlinkPending]);

  // Reset selected org when tenant becomes unlinked
  useEffect(() => {
    if (!isLinked) {
      setSelectedOrgId("");
    }
  }, [isLinked]);

  // Show success after link/unlink completes without error
  useEffect(() => {
    if (linkState.error === "" && linkPending === false) {
      // We check if the form was actually submitted by looking at the linkState
    }
  }, [linkState, linkPending]);

  const selectedOrg = ninjaOrgs.find(
    (o) => o.id === Number(selectedOrgId)
  );

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

      {/* NinjaOne Organization */}
      <td className="px-4 py-3">
        {isLinked ? (
          <span className="text-sm text-[var(--text-secondary)]">
            {tenant.ninjaOrgName}
          </span>
        ) : (
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            disabled={pending}
            className="w-full text-sm px-2.5 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
          >
            <option value="">— Select Organization —</option>
            {ninjaOrgs.map((org) => (
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
              <input type="hidden" name="ninjaOrgId" value={selectedOrgId} />
              <input
                type="hidden"
                name="ninjaOrgName"
                value={selectedOrg?.name ?? ""}
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

export function NinjaLinkTable({ tenants, ninjaOrgs }: NinjaLinkTableProps) {
  const linkedCount = tenants.filter((t) => t.ninjaOrgId !== null).length;

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
                NinjaOne Organization
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
                ninjaOrgs={ninjaOrgs}
              />
            ))}
            {tenants.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-sm text-[var(--text-muted)]"
                >
                  No tenants found. Add tenants first to link them to NinjaOne
                  organizations.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
