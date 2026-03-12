"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Mail,
  Shield,
  UsersRound,
  Clock,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lock,
  Search,
  Fingerprint,
} from "lucide-react";
import { BookmarkButton } from "@/components/bookmark-button";

/* ─── Types ─── */

type ADMember = {
  user: {
    id: number;
    displayName: string;
    samAccountName: string;
    mail: string | null;
    upn: string;
    jobTitle: string | null;
    department: string | null;
    accountEnabled: boolean;
    lockedOut: boolean;
  };
};

type ADGroupDetail = {
  id: number;
  samAccountName: string;
  displayName: string;
  description: string | null;
  groupCategory: string;
  groupScope: string;
  memberCount: number;
  syncedAt: string;
  members: ADMember[];
};

type GroupDetailPanelProps = {
  tenantId: string;
  groupSam: string;
  groupName: string;
  onClose: () => void;
};

/* ─── Main Component ─── */

export function GroupDetailPanel({
  tenantId,
  groupSam,
  groupName,
  onClose,
}: GroupDetailPanelProps) {
  const [data, setData] = useState<ADGroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  // Slide-in animation
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Escape key to close
  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handleClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Fetch AD group details
  useEffect(() => {
    let cancelled = false;

    async function fetchDetails() {
      try {
        const res = await fetch(
          `/api/tenants/${tenantId}/ad/groups/${encodeURIComponent(groupSam)}`
        );
        if (cancelled) return;

        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || "Failed to fetch group details");
        }

        const d: ADGroupDetail = await res.json();
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Failed to fetch group details"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDetails();
    return () => {
      cancelled = true;
    };
  }, [tenantId, groupSam]);

  // Initials for avatar
  const initials = groupName
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isSecurity = data?.groupCategory === "Security";

  const panel = (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/50 transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-[70] h-full w-full max-w-[540px] bg-[var(--bg-secondary)] border-l border-[var(--border)] shadow-2xl transition-transform duration-300 ease-out ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  isSecurity || !data
                    ? "bg-[var(--accent)]/15"
                    : "bg-[var(--success)]/15"
                }`}
              >
                {isSecurity || !data ? (
                  <Shield className="w-5 h-5 text-[var(--accent)]" />
                ) : (
                  <Mail className="w-5 h-5 text-[var(--success)]" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">
                  {groupName}
                </h3>
                {data && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        data.groupCategory === "Security"
                          ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                          : "bg-[var(--success)]/10 text-[var(--success)]"
                      }`}
                    >
                      {data.groupCategory === "Security" ? (
                        <Shield className="w-2.5 h-2.5" />
                      ) : (
                        <Mail className="w-2.5 h-2.5" />
                      )}
                      {data.groupCategory}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-hover)] px-2 py-0.5 rounded-full">
                      {data.groupScope}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <BookmarkButton
                entityType="ad_group"
                entityId={`${tenantId}:${groupSam}`}
                label={groupName}
              />
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {loading && <SkeletonBody />}
            {error && !loading && <ErrorState message={error} />}
            {data && !loading && !error && <DetailBody data={data} />}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(panel, document.body);
}

/* ─── Detail Body ─── */

function DetailBody({ data }: { data: ADGroupDetail }) {
  return (
    <div className="p-6 space-y-6">
      {/* Group Info */}
      <Section title="Group Info" icon={<UsersRound className="w-4 h-4" />}>
        {data.description && (
          <p className="text-sm text-[var(--text-secondary)] mb-3 pb-3 border-b border-[var(--border)]">
            {data.description}
          </p>
        )}
        <InfoRow
          icon={<Shield className="w-3.5 h-3.5" />}
          label="Category"
          value={data.groupCategory}
        />
        <InfoRow
          icon={<UsersRound className="w-3.5 h-3.5" />}
          label="Scope"
          value={data.groupScope}
        />
        <InfoRow
          icon={<UsersRound className="w-3.5 h-3.5" />}
          label="Member Count"
          value={String(data.memberCount)}
        />
        <InfoRow
          icon={<Fingerprint className="w-3.5 h-3.5" />}
          label="SAM Account"
          value={data.samAccountName}
          mono
        />
        <InfoRow
          icon={<Clock className="w-3.5 h-3.5" />}
          label="Last Synced"
          value={new Date(data.syncedAt).toLocaleString()}
        />
      </Section>

      {/* Members */}
      <MembersSection members={data.members} />
    </div>
  );
}

/* ─── Members Section ─── */

function MembersSection({ members }: { members: ADMember[] }) {
  const [filter, setFilter] = useState("");

  const filteredMembers = filter
    ? members.filter(
        ({ user }) =>
          user.displayName.toLowerCase().includes(filter.toLowerCase()) ||
          user.samAccountName.toLowerCase().includes(filter.toLowerCase()) ||
          (user.mail || "").toLowerCase().includes(filter.toLowerCase()) ||
          (user.department || "").toLowerCase().includes(filter.toLowerCase())
      )
    : members;

  const enabledCount = members.filter(({ user }) => user.accountEnabled).length;
  const disabledCount = members.length - enabledCount;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[var(--accent)]">
          <UsersRound className="w-4 h-4" />
        </span>
        <h4 className="text-sm font-semibold text-[var(--text-primary)]">
          Members
        </h4>
        <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-hover)] px-1.5 py-0.5 rounded-full">
          {members.length}
        </span>
        {members.length > 0 && (
          <div className="ml-auto flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-[var(--success)]" />
              {enabledCount}
            </span>
            <span className="flex items-center gap-1">
              <XCircle className="w-3 h-3 text-[var(--error)]" />
              {disabledCount}
            </span>
          </div>
        )}
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
        {members.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No members</p>
        ) : (
          <>
            {members.length > 5 && (
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter members..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>
            )}

            {filteredMembers.length > 0 ? (
              <div className="space-y-0.5 max-h-80 overflow-y-auto">
                {filteredMembers.map(({ user }) => (
                  <MemberRow key={user.id} user={user} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)] text-center py-2">
                No members match &ldquo;{filter}&rdquo;
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MemberRow({ user }: { user: ADMember["user"] }) {
  const initials = user.displayName
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 py-1.5 px-1 rounded hover:bg-[var(--bg-hover)] transition-colors">
      <div className="w-7 h-7 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center text-[10px] font-bold shrink-0">
        {initials || "?"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-primary)] truncate">
            {user.displayName}
          </span>
          {user.accountEnabled ? (
            <CheckCircle2 className="w-3 h-3 text-[var(--success)] shrink-0" />
          ) : (
            <XCircle className="w-3 h-3 text-[var(--error)] shrink-0" />
          )}
          {user.lockedOut && (
            <Lock className="w-3 h-3 text-[var(--warning)] shrink-0" />
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)] truncate font-mono">
          {user.samAccountName}
          {user.department ? ` · ${user.department}` : ""}
        </p>
      </div>
    </div>
  );
}

/* ─── Shared Sub-components ─── */

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[var(--accent)]">{icon}</span>
        <h4 className="text-sm font-semibold text-[var(--text-primary)]">
          {title}
        </h4>
      </div>
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
        {children}
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-[var(--text-muted)]">{icon}</span>
      <span className="text-xs text-[var(--text-muted)] w-28 shrink-0">
        {label}
      </span>
      <span
        className={`text-sm text-[var(--text-primary)] truncate ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value || "\u2014"}
      </span>
    </div>
  );
}

/* ─── Loading Skeleton ─── */

function SkeletonBody() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-[var(--accent)] animate-spin" />
        <span className="ml-3 text-sm text-[var(--text-secondary)]">
          Loading group details...
        </span>
      </div>
      {[1, 2].map((i) => (
        <div key={i}>
          <div className="h-4 w-24 bg-[var(--bg-hover)] rounded animate-pulse mb-3" />
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 space-y-3">
            <div className="h-3 w-3/4 bg-[var(--bg-hover)] rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-[var(--bg-hover)] rounded animate-pulse" />
            <div className="h-3 w-2/3 bg-[var(--bg-hover)] rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Error State ─── */

function ErrorState({ message }: { message: string }) {
  return (
    <div className="p-6">
      <div className="bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-[var(--error)] shrink-0" />
          <div>
            <p className="text-sm font-medium text-[var(--error)]">
              Failed to load details
            </p>
            <p className="text-xs text-[var(--error)]/70 mt-1">{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
