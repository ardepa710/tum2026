"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Mail,
  Shield,
  Calendar,
  UsersRound,
  Crown,
  Globe,
  Tag,
  Lock,
  Unlock,
  RefreshCw,
  Clock,
  Loader2,
  AlertTriangle,
  User,
  CheckCircle2,
  XCircle,
  Search,
  Code,
} from "lucide-react";
import type {
  GroupDetailResponse,
  GroupMember,
  GroupOwner,
} from "@/lib/types/group-detail";

type GroupDetailPanelProps = {
  tenantId: string;
  groupId: string;
  groupName: string;
  onClose: () => void;
};

export function GroupDetailPanel({
  tenantId,
  groupId,
  groupName,
  onClose,
}: GroupDetailPanelProps) {
  const [data, setData] = useState<GroupDetailResponse | null>(null);
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

  // Fetch group details
  useEffect(() => {
    let cancelled = false;

    async function fetchDetails() {
      try {
        const res = await fetch(
          `/api/tenants/${tenantId}/groups/${groupId}`
        );
        if (cancelled) return;

        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || "Failed to fetch group details");
        }

        const d: GroupDetailResponse = await res.json();
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
  }, [tenantId, groupId]);

  // Initials for avatar
  const initials = groupName
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
              <div className="w-10 h-10 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white text-sm font-bold shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">
                  {groupName}
                </h3>
                {data?.group && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <GroupTypeBadge group={data.group} />
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
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

function DetailBody({ data }: { data: GroupDetailResponse }) {
  const { group, members, owners } = data;

  return (
    <div className="p-6 space-y-6">
      {/* Group Info */}
      <Section title="Group Info" icon={<UsersRound className="w-4 h-4" />}>
        {group.description && (
          <p className="text-sm text-[var(--text-secondary)] mb-3">
            {group.description}
          </p>
        )}
        <InfoRow
          icon={<Mail className="w-3.5 h-3.5" />}
          label="Mail"
          value={group.mail}
        />
        <InfoRow
          icon={<Mail className="w-3.5 h-3.5" />}
          label="Mail Nickname"
          value={group.mailNickname}
        />
        <InfoRow
          icon={<Globe className="w-3.5 h-3.5" />}
          label="Visibility"
          value={group.visibility || "Not set"}
        />
        <InfoRow
          icon={<Shield className="w-3.5 h-3.5" />}
          label="Security Enabled"
          value={group.securityEnabled ? "Yes" : "No"}
        />
        <InfoRow
          icon={<Mail className="w-3.5 h-3.5" />}
          label="Mail Enabled"
          value={group.mailEnabled ? "Yes" : "No"}
        />
      </Section>

      {/* Dates */}
      <Section title="Dates" icon={<Calendar className="w-4 h-4" />}>
        <InfoRow
          icon={<Calendar className="w-3.5 h-3.5" />}
          label="Created"
          value={formatDate(group.createdDateTime)}
        />
        <InfoRow
          icon={<RefreshCw className="w-3.5 h-3.5" />}
          label="Renewed"
          value={formatDate(group.renewedDateTime)}
        />
        {group.expirationDateTime && (
          <InfoRow
            icon={<Clock className="w-3.5 h-3.5" />}
            label="Expires"
            value={formatDate(group.expirationDateTime)}
          />
        )}
      </Section>

      {/* Dynamic Membership Rule */}
      {group.membershipRule && (
        <Section title="Dynamic Rule" icon={<Code className="w-4 h-4" />}>
          <div className="space-y-2">
            <InfoRow
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              label="Processing"
              value={group.membershipRuleProcessingState || "Unknown"}
            />
            <div className="mt-2 p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border)]">
              <code className="text-xs text-[var(--text-secondary)] break-all">
                {group.membershipRule}
              </code>
            </div>
          </div>
        </Section>
      )}

      {/* Proxy Addresses */}
      {group.proxyAddresses && group.proxyAddresses.length > 0 && (
        <Section
          title="Proxy Addresses"
          icon={<Mail className="w-4 h-4" />}
          count={group.proxyAddresses.length}
        >
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {group.proxyAddresses.map((addr, i) => (
              <div key={i} className="flex items-center gap-2 py-0.5">
                {addr.startsWith("SMTP:") ? (
                  <Lock className="w-3 h-3 text-[var(--accent)] shrink-0" />
                ) : (
                  <Unlock className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                )}
                <span className="text-xs text-[var(--text-secondary)] truncate">
                  {addr}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Owners */}
      <Section
        title="Owners"
        icon={<Crown className="w-4 h-4" />}
        count={owners.length}
      >
        {owners.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No owners</p>
        ) : (
          <div className="space-y-2">
            {owners.map((owner) => (
              <OwnerRow key={owner.id} owner={owner} />
            ))}
          </div>
        )}
      </Section>

      {/* Members */}
      <MembersSection members={members} />
    </div>
  );
}

/* ─── Sub-components ─── */

function Section({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[var(--accent)]">{icon}</span>
        <h4 className="text-sm font-semibold text-[var(--text-primary)]">
          {title}
        </h4>
        {count !== undefined && (
          <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-hover)] px-1.5 py-0.5 rounded-full">
            {count}
          </span>
        )}
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
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-[var(--text-muted)]">{icon}</span>
      <span className="text-xs text-[var(--text-muted)] w-32 shrink-0">
        {label}
      </span>
      <span className="text-sm text-[var(--text-primary)] truncate">
        {value || "\u2014"}
      </span>
    </div>
  );
}

function GroupTypeBadge({
  group,
}: {
  group: GroupDetailResponse["group"];
}) {
  const isDynamic = group.groupTypes?.includes("DynamicMembership");
  const isM365 = group.groupTypes?.includes("Unified");

  const badges: { label: string; className: string }[] = [];

  if (isM365) {
    badges.push({
      label: "Microsoft 365",
      className: "bg-[var(--accent)]/10 text-[var(--accent)]",
    });
  }
  if (isDynamic) {
    badges.push({
      label: "Dynamic",
      className: "bg-[var(--success)]/10 text-[var(--success)]",
    });
  }
  if (group.securityEnabled && !isM365) {
    badges.push({
      label: "Security",
      className: "bg-[var(--bg-hover)] text-[var(--text-muted)]",
    });
  }
  if (group.mailEnabled && !isM365) {
    badges.push({
      label: "Mail-Enabled",
      className: "bg-[var(--warning)]/10 text-[var(--warning)]",
    });
  }

  if (badges.length === 0) {
    badges.push({
      label: "Security",
      className: "bg-[var(--bg-hover)] text-[var(--text-muted)]",
    });
  }

  return (
    <div className="flex items-center gap-1">
      {badges.map((b) => (
        <span
          key={b.label}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${b.className}`}
        >
          <Tag className="w-2.5 h-2.5" />
          {b.label}
        </span>
      ))}
    </div>
  );
}

function OwnerRow({ owner }: { owner: GroupOwner }) {
  const initials = owner.displayName
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-[var(--warning)]/20 text-[var(--warning)] flex items-center justify-center text-xs font-bold shrink-0">
        {initials}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
          {owner.displayName}
        </p>
        <p className="text-xs text-[var(--text-muted)] truncate">
          {owner.mail || owner.userPrincipalName || "No email"}
        </p>
      </div>
    </div>
  );
}

function MembersSection({ members }: { members: GroupMember[] }) {
  const [memberFilter, setMemberFilter] = useState("");

  const userMembers = members.filter(
    (m) => m["@odata.type"] === "#microsoft.graph.user"
  );
  const otherMembers = members.filter(
    (m) => m["@odata.type"] !== "#microsoft.graph.user"
  );

  const filteredUsers = memberFilter
    ? userMembers.filter(
        (m) =>
          m.displayName.toLowerCase().includes(memberFilter.toLowerCase()) ||
          (m.mail || "").toLowerCase().includes(memberFilter.toLowerCase()) ||
          (m.jobTitle || "").toLowerCase().includes(memberFilter.toLowerCase())
      )
    : userMembers;

  const filteredOther = memberFilter
    ? otherMembers.filter(
        (m) =>
          m.displayName.toLowerCase().includes(memberFilter.toLowerCase())
      )
    : otherMembers;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[var(--accent)]">
          <User className="w-4 h-4" />
        </span>
        <h4 className="text-sm font-semibold text-[var(--text-primary)]">
          Members
        </h4>
        <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-hover)] px-1.5 py-0.5 rounded-full">
          {members.length}
        </span>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
        {members.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No members</p>
        ) : (
          <>
            {/* Filter if many members */}
            {members.length > 5 && (
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter members..."
                  value={memberFilter}
                  onChange={(e) => setMemberFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>
            )}

            {/* User members */}
            {filteredUsers.length > 0 && (
              <div className="space-y-0.5 max-h-72 overflow-y-auto">
                {filteredUsers.map((member) => (
                  <MemberRow key={member.id} member={member} />
                ))}
              </div>
            )}

            {/* Other members (groups, service principals) */}
            {filteredOther.length > 0 && (
              <>
                {filteredUsers.length > 0 && (
                  <div className="my-2 border-t border-[var(--border)]" />
                )}
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                  Other ({filteredOther.length})
                </p>
                <div className="space-y-0.5 max-h-36 overflow-y-auto">
                  {filteredOther.map((member) => (
                    <MemberRow key={member.id} member={member} />
                  ))}
                </div>
              </>
            )}

            {/* Filter no results */}
            {memberFilter && filteredUsers.length === 0 && filteredOther.length === 0 && (
              <p className="text-sm text-[var(--text-muted)] text-center py-2">
                No members match &ldquo;{memberFilter}&rdquo;
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MemberRow({ member }: { member: GroupMember }) {
  const isUser = member["@odata.type"] === "#microsoft.graph.user";

  const initials = member.displayName
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 py-1.5 px-1 rounded hover:bg-[var(--bg-hover)] transition-colors">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
          isUser
            ? "bg-[var(--accent)]/15 text-[var(--accent)]"
            : "bg-[var(--bg-hover)] text-[var(--text-muted)]"
        }`}
      >
        {initials || "?"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-primary)] truncate">
            {member.displayName}
          </span>
          {isUser && member.accountEnabled !== undefined && (
            member.accountEnabled ? (
              <CheckCircle2 className="w-3 h-3 text-[var(--success)] shrink-0" />
            ) : (
              <XCircle className="w-3 h-3 text-[var(--error)] shrink-0" />
            )
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)] truncate">
          {isUser
            ? member.jobTitle || member.mail || member.userPrincipalName || "User"
            : odataTypeLabel(member["@odata.type"])}
        </p>
      </div>
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
      {[1, 2, 3, 4].map((i) => (
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

/* ─── Helpers ─── */

function formatDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function odataTypeLabel(type: string): string {
  const map: Record<string, string> = {
    "#microsoft.graph.user": "User",
    "#microsoft.graph.group": "Nested Group",
    "#microsoft.graph.servicePrincipal": "Service Principal",
    "#microsoft.graph.device": "Device",
    "#microsoft.graph.orgContact": "Org Contact",
  };
  return map[type] || type.replace("#microsoft.graph.", "");
}
