"use client";

import Link from "next/link";
import { FolderTree, Monitor, Server } from "lucide-react";
import type { SophosEndpointGroup } from "@/lib/types/sophos";

interface Props {
  group: SophosEndpointGroup;
  tenantId: number;
  tenantAbbrv: string;
}

export function SophosGroupCard({ group, tenantId, tenantAbbrv }: Props) {
  return (
    <Link
      href={`/dashboard/sophos/groups/${group.id}?tenantId=${tenantId}`}
      className="block bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-5 hover:border-[var(--accent)]/50 hover:-translate-y-1 transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
          <FolderTree className="w-5 h-5" style={{ color: "var(--accent)" }} />
        </div>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400">
          {tenantAbbrv}
        </span>
      </div>

      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1 truncate">
        {group.name}
      </h3>

      {group.description && (
        <p className="text-xs text-[var(--text-secondary)] mb-3 line-clamp-2">
          {group.description}
        </p>
      )}

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
          {group.type === "server" ? (
            <Server className="w-3 h-3" />
          ) : (
            <Monitor className="w-3 h-3" />
          )}
          <span>{group.type === "server" ? "Server" : "Computer"}</span>
        </div>
        <span className="text-xs text-[var(--text-secondary)]">
          {group.endpoints?.itemsCount ?? 0} endpoints
        </span>
      </div>
    </Link>
  );
}
