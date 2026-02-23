"use client";

import { useState, useEffect } from "react";
import { Loader2, Shield, Unlink, ExternalLink } from "lucide-react";
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

export function NinjaCrossLinkSection({
  tenantId,
  ninjaDeviceId,
  ninjaDeviceName,
  role,
}: {
  tenantId: number | null;
  ninjaDeviceId: number;
  ninjaDeviceName: string;
  role: string;
}) {
  const [link, setLink] = useState<CrossLink | null | undefined>(undefined);
  const [unlinking, setUnlinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canEdit = role === "ADMIN" || role === "EDITOR";

  useEffect(() => {
    // If no tenantId, we can't look up cross-links
    if (tenantId === null) {
      setLink(null);
      return;
    }

    fetch(`/api/cross-links?tenantId=${tenantId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((links: CrossLink[]) => {
        const match = links.find((l) => l.ninjaDeviceId === ninjaDeviceId);
        setLink(match ?? null);
      })
      .catch(() => setLink(null));
  }, [tenantId, ninjaDeviceId]);

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

  // No tenant linked to this device's organization
  if (tenantId === null) {
    return (
      <div className="pt-3">
        <p className="text-sm text-[var(--text-muted)]">
          This device&apos;s organization is not linked to a tenant.
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Link the NinjaOne organization to a tenant first to enable
          cross-linking.
        </p>
      </div>
    );
  }

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
          Not linked to any Sophos endpoint.
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
            <Shield className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {link.sophosEndpointName}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Linked {new Date(link.linkedAt).toLocaleDateString()} by{" "}
              {link.linkedBy}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/sophos/endpoints/${link.sophosEndpointId}?tenantId=${tenantId}`}
            className="inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            View Endpoint
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
