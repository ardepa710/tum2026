"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Shield, Unlink, ExternalLink, Link2, Search, ChevronDown } from "lucide-react";
import Link from "next/link";
import { createCrossLink, deleteCrossLink } from "@/app/dashboard/sophos/cross-links/actions";

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

type Candidate = { id: string; name: string };

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

  // Inline assignment state
  const [assigning, setAssigning] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [linking, setLinking] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

  // Fetch candidates when entering assign mode
  useEffect(() => {
    if (assigning && !candidates && !candidatesLoading && tenantId) {
      setCandidatesLoading(true);
      fetch(`/api/cross-links/candidates?tenantId=${tenantId}&side=sophos`)
        .then((res) => (res.ok ? res.json() : { candidates: [] }))
        .then((data) => setCandidates(data.candidates ?? []))
        .catch(() => setCandidates([]))
        .finally(() => setCandidatesLoading(false));
    }
  }, [assigning, candidates, candidatesLoading, tenantId]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!assigning) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAssigning(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [assigning]);

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

  const handleLink = async (candidate: Candidate) => {
    if (!tenantId) return;
    setLinking(true);
    setError(null);
    const result = await createCrossLink(
      tenantId,
      ninjaDeviceId,
      ninjaDeviceName,
      candidate.id,
      candidate.name,
    );
    if (result.success) {
      setLink({
        id: result.crossLink.id,
        tenantId: result.crossLink.tenantId,
        ninjaDeviceId: result.crossLink.ninjaDeviceId,
        ninjaDeviceName: result.crossLink.ninjaDeviceName,
        sophosEndpointId: result.crossLink.sophosEndpointId,
        sophosEndpointName: result.crossLink.sophosEndpointName,
        linkedAt: result.crossLink.linkedAt.toISOString(),
        linkedBy: result.crossLink.linkedBy,
      });
      setAssigning(false);
      setSearch("");
      setCandidates(null);
    } else {
      setError(result.error);
    }
    setLinking(false);
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

  // Not linked state — show inline assignment
  if (link === null) {
    const filtered = candidates
      ? candidates.filter((c) =>
          c.name.toLowerCase().includes(search.toLowerCase()),
        )
      : [];

    return (
      <div className="pt-3" ref={dropdownRef}>
        {!assigning ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-muted)]">
              Not linked to any Sophos endpoint.
            </p>
            {canEdit && (
              <button
                onClick={() => setAssigning(true)}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors"
              >
                <Link2 className="w-3 h-3" />
                Link Endpoint
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search Sophos endpoints..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg-primary)]">
              {candidatesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
                  <span className="ml-2 text-xs text-[var(--text-muted)]">
                    Loading endpoints...
                  </span>
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] text-center py-4">
                  {candidates && candidates.length === 0
                    ? "No available endpoints."
                    : "No endpoints match your search."}
                </p>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleLink(c)}
                    disabled={linking}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50 border-b border-[var(--border)] last:border-b-0"
                  >
                    <Shield className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                    <span className="text-sm text-[var(--text-primary)] truncate">
                      {c.name}
                    </span>
                  </button>
                ))
              )}
            </div>
            {linking && (
              <div className="flex items-center gap-2 text-xs text-[var(--accent)]">
                <Loader2 className="w-3 h-3 animate-spin" />
                Linking...
              </div>
            )}
            <button
              onClick={() => {
                setAssigning(false);
                setSearch("");
              }}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
        {error && <p className="text-xs text-[var(--error)] mt-2">{error}</p>}
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
