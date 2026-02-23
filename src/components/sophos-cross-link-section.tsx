"use client";

import { useState, useEffect } from "react";
import { Loader2, Monitor, Unlink, ExternalLink } from "lucide-react";
import Link from "next/link";
import { deleteCrossLink } from "@/app/dashboard/sophos/cross-links/actions";

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

export function SophosCrossLinkSection({
  tenantId,
  sophosEndpointId,
  sophosEndpointName,
  role,
}: {
  tenantId: number;
  sophosEndpointId: string;
  sophosEndpointName: string;
  role: string;
}) {
  const [link, setLink] = useState<CrossLink | null | undefined>(undefined);
  const [unlinking, setUnlinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canEdit = role === "ADMIN" || role === "EDITOR";

  useEffect(() => {
    fetch(`/api/cross-links?tenantId=${tenantId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((links: CrossLink[]) => {
        const match = links.find(
          (l) => l.sophosEndpointId === sophosEndpointId,
        );
        setLink(match ?? null);
      })
      .catch(() => setLink(null));
  }, [tenantId, sophosEndpointId]);

  const handleUnlink = async () => {
    if (!link) return;
    setUnlinking(true);
    setError(null);
    const result = await deleteCrossLink(link.id);
    if (result.success) {
      setLink(null);
    } else {
      setError(result.error);
    }
    setUnlinking(false);
  };

  // Loading state
  if (link === undefined) {
    return (
      <div className="pt-3 flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
        <span className="ml-2 text-sm text-[var(--text-secondary)]">
          Loading...
        </span>
      </div>
    );
  }

  // Not linked state
  if (link === null) {
    return (
      <div className="pt-3">
        <p className="text-sm text-[var(--text-muted)]">
          Not linked to any RMM device.
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Use the{" "}
          <Link
            href="/dashboard/sophos/settings"
            className="text-[var(--accent)] hover:underline"
          >
            Cross-Link Manager
          </Link>{" "}
          to link devices.
        </p>
      </div>
    );
  }

  // Linked state
  return (
    <div className="pt-3">
      <div className="flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
            <Monitor className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {link.ninjaDeviceName}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Linked {new Date(link.linkedAt).toLocaleDateString()} by{" "}
              {link.linkedBy}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/rmm/devices/${link.ninjaDeviceId}`}
            className="inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            View Device
          </Link>
          {canEdit && (
            <button
              onClick={handleUnlink}
              disabled={unlinking}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-[var(--error)]/10 text-[var(--error)] hover:bg-[var(--error)]/20 transition-colors disabled:opacity-50"
            >
              {unlinking ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Unlink className="w-3 h-3" />
              )}
              Unlink
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-[var(--error)] mt-2">{error}</p>}
    </div>
  );
}
