"use client";

import Link from "next/link";
import { Building2, Monitor, LinkIcon } from "lucide-react";

type NinjaOrgCardProps = {
  org: {
    id: number;
    name: string;
    description?: string;
    nodeApprovalMode?: string;
  };
  deviceCount?: number;
  linkedTenant?: { tenantName: string; tenantAbbrv: string } | null;
};

export function NinjaOrgCard({ org, deviceCount, linkedTenant }: NinjaOrgCardProps) {
  return (
    <Link
      href={`/dashboard/rmm/tenants/${org.id}`}
      className="block bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
          <Building2 className="w-4.5 h-4.5" style={{ color: "var(--accent)" }} />
        </div>
        {linkedTenant ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--success)]/10 text-[var(--success)]">
            <LinkIcon className="w-2.5 h-2.5" />
            Linked: {linkedTenant.tenantAbbrv}
          </span>
        ) : (
          <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--text-muted)]/10 text-[var(--text-muted)]">
            Not linked
          </span>
        )}
      </div>

      {/* Name */}
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
        {org.name}
      </h3>

      {/* Description */}
      {org.description && (
        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-3">
          {org.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center gap-3 mt-auto pt-2">
        {deviceCount !== undefined && (
          <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
            <Monitor className="w-3 h-3" />
            {deviceCount} device{deviceCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </Link>
  );
}
