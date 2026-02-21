"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Mail,
  Phone,
  Building2,
  MapPin,
  Shield,
  Calendar,
  KeyRound,
  LogIn,
  UserRound,
  UsersRound,
  CreditCard,
  Inbox,
  Clock,
  Globe,
  Tag,
  Loader2,
  AlertTriangle,
  Cog,
  Ticket,
  UserCheck,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { BookmarkButton } from "@/components/bookmark-button";
import type {
  UserDetailResponse,
  MemberOfEntry,
  LicenseDetail,
  MailboxSettings,
  ManagerInfo,
} from "@/lib/types/user-detail";

type AvailableTask = {
  id: number;
  taskName: string;
  taskCode: string;
  taskDetails: string | null;
  ticketRequired: boolean;
  usernameRequired: boolean;
  syncRequired: boolean;
  rewstWebhook: string | null;
  tenantExclusive: string | null;
};

type UserDetailPanelProps = {
  tenantId: string;
  userId: string;
  userName: string;
  onClose: () => void;
};

export function UserDetailPanel({
  tenantId,
  userId,
  userName,
  onClose,
}: UserDetailPanelProps) {
  const [data, setData] = useState<UserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [availableTasks, setAvailableTasks] = useState<AvailableTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");

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

  // Fetch user details
  useEffect(() => {
    let cancelled = false;

    async function fetchDetails() {
      try {
        const res = await fetch(
          `/api/tenants/${tenantId}/users/${userId}`
        );
        if (cancelled) return;

        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || "Failed to fetch user details");
        }

        const d: UserDetailResponse = await res.json();
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Failed to fetch user details"
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
  }, [tenantId, userId]);

  // Fetch available tasks for the logged-in technician
  useEffect(() => {
    fetch("/api/tech/available-tasks")
      .then((res) => (res.ok ? res.json() : []))
      .then((tasks: AvailableTask[]) => setAvailableTasks(tasks))
      .catch(() => setAvailableTasks([]));
  }, []);

  const selectedTask = availableTasks.find(
    (t) => t.id === Number(selectedTaskId)
  );

  // Initials for avatar
  const initials = userName
    .split(" ")
    .map((w) => w[0])
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
        className={`fixed top-0 right-0 z-[70] h-full w-full max-w-[500px] bg-[var(--bg-secondary)] border-l border-[var(--border)] shadow-2xl transition-transform duration-300 ease-out ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-sm font-bold shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">
                  {userName}
                </h3>
                {data?.user?.jobTitle && (
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {data.user.jobTitle}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {data?.user && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    data.user.accountEnabled
                      ? "bg-[var(--success)]/10 text-[var(--success)]"
                      : "bg-[var(--error)]/10 text-[var(--error)]"
                  }`}
                >
                  {data.user.accountEnabled ? "Enabled" : "Disabled"}
                </span>
              )}
              <BookmarkButton
                entityType="ad_user"
                entityId={`${tenantId}:${userId}`}
                label={userName}
                metadata={{ email: data?.user?.mail }}
              />
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Task Selector */}
          {availableTasks.length > 0 && (
            <div className="px-6 py-3 border-b border-[var(--border)] bg-[var(--bg-card)]">
              <div className="flex items-center gap-2 mb-2">
                <Cog className="w-4 h-4 text-[var(--accent)]" />
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  Run Task
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <select
                    value={selectedTaskId}
                    onChange={(e) => {
                      setSelectedTaskId(e.target.value);
                      setTicketNumber("");
                    }}
                    className="w-full appearance-none px-3 py-2 pr-8 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  >
                    <option value="">Select a task...</option>
                    {availableTasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.taskName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                </div>
                <button
                  disabled={!selectedTaskId}
                  className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  Execute
                </button>
              </div>
              {/* Freshservice Ticket # — visible only when task requires ticket */}
              {selectedTask?.ticketRequired && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-[var(--warning)]" />
                    <label className="text-xs font-semibold text-[var(--text-primary)]">
                      Freshservice Ticket #
                    </label>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 123456"
                    value={ticketNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setTicketNumber(val);
                    }}
                    maxLength={6}
                    className="mt-1 w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--warning)] transition-colors font-mono tracking-wider"
                  />
                </div>
              )}

              {selectedTask && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-[var(--text-muted)] font-mono">
                    {selectedTask.taskCode}
                  </span>
                  {selectedTask.ticketRequired && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[var(--warning)]/10 text-[var(--warning)] text-[10px] rounded">
                      <Ticket className="w-2.5 h-2.5" />
                      Ticket
                    </span>
                  )}
                  {selectedTask.usernameRequired && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[var(--accent)]/10 text-[var(--accent)] text-[10px] rounded">
                      <UserCheck className="w-2.5 h-2.5" />
                      Username
                    </span>
                  )}
                  {selectedTask.syncRequired && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[var(--success)]/10 text-[var(--success)] text-[10px] rounded">
                      <RefreshCw className="w-2.5 h-2.5" />
                      Sync
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

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

function DetailBody({ data }: { data: UserDetailResponse }) {
  const { user, memberOf, licenses, mailboxSettings, manager } = data;

  return (
    <div className="p-6 space-y-6">
      {/* Contact Info */}
      <Section title="Contact" icon={<Mail className="w-4 h-4" />}>
        <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={user.mail} />
        <InfoRow
          icon={<Phone className="w-3.5 h-3.5" />}
          label="Mobile"
          value={user.mobilePhone}
        />
        {user.businessPhones?.length > 0 && (
          <InfoRow
            icon={<Phone className="w-3.5 h-3.5" />}
            label="Business Phone"
            value={user.businessPhones[0]}
          />
        )}
        <InfoRow
          icon={<MapPin className="w-3.5 h-3.5" />}
          label="Office"
          value={user.officeLocation}
        />
        <InfoRow
          icon={<Building2 className="w-3.5 h-3.5" />}
          label="Company"
          value={user.companyName}
        />
        <InfoRow
          icon={<UsersRound className="w-3.5 h-3.5" />}
          label="Department"
          value={user.department}
        />
      </Section>

      {/* Account Details */}
      <Section title="Account" icon={<Shield className="w-4 h-4" />}>
        <InfoRow
          icon={<Globe className="w-3.5 h-3.5" />}
          label="UPN"
          value={user.userPrincipalName}
        />
        <InfoRow
          icon={<Calendar className="w-3.5 h-3.5" />}
          label="Created"
          value={formatDate(user.createdDateTime)}
        />
        <InfoRow
          icon={<KeyRound className="w-3.5 h-3.5" />}
          label="Last Password Change"
          value={formatDate(user.lastPasswordChangeDateTime)}
        />
        {user.signInActivity && (
          <InfoRow
            icon={<LogIn className="w-3.5 h-3.5" />}
            label="Last Sign-In"
            value={formatDate(user.signInActivity.lastSignInDateTime)}
          />
        )}
      </Section>

      {/* Manager */}
      <Section title="Manager" icon={<UserRound className="w-4 h-4" />}>
        {manager ? (
          <ManagerCard manager={manager} />
        ) : (
          <p className="text-sm text-[var(--text-muted)]">No manager assigned</p>
        )}
      </Section>

      {/* Groups & Roles */}
      <Section
        title="Groups & Roles"
        icon={<UsersRound className="w-4 h-4" />}
        count={memberOf.length}
      >
        {memberOf.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No group memberships</p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {memberOf.map((entry) => (
              <MemberOfRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </Section>

      {/* Licenses */}
      <Section
        title="Licenses"
        icon={<CreditCard className="w-4 h-4" />}
        count={licenses.length}
      >
        {licenses.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No licenses assigned</p>
        ) : (
          <div className="space-y-3">
            {licenses.map((lic) => (
              <LicenseCard key={lic.id} license={lic} />
            ))}
          </div>
        )}
      </Section>

      {/* Mailbox Settings */}
      <Section title="Mailbox" icon={<Inbox className="w-4 h-4" />}>
        {mailboxSettings ? (
          <MailboxCard settings={mailboxSettings} />
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            Mailbox settings unavailable
          </p>
        )}
      </Section>
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
      <span className="text-xs text-[var(--text-muted)] w-28 shrink-0">
        {label}
      </span>
      <span className="text-sm text-[var(--text-primary)] truncate">
        {value || "\u2014"}
      </span>
    </div>
  );
}

function ManagerCard({ manager }: { manager: ManagerInfo }) {
  const initials = manager.displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center text-xs font-bold shrink-0">
        {initials}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
          {manager.displayName}
        </p>
        <p className="text-xs text-[var(--text-muted)] truncate">
          {manager.jobTitle || "No title"} {manager.mail ? `\u00B7 ${manager.mail}` : ""}
        </p>
      </div>
    </div>
  );
}

function MemberOfRow({ entry }: { entry: MemberOfEntry }) {
  const isRole = entry["@odata.type"] === "#microsoft.graph.directoryRole";
  const isDynamic =
    entry.groupTypes?.includes("DynamicMembership");
  const isM365 = entry.groupTypes?.includes("Unified");

  let badgeLabel: string;
  let badgeClass: string;

  if (isRole) {
    badgeLabel = "Role";
    badgeClass = "bg-[var(--warning)]/10 text-[var(--warning)]";
  } else if (isDynamic) {
    badgeLabel = "Dynamic";
    badgeClass = "bg-[var(--success)]/10 text-[var(--success)]";
  } else if (isM365) {
    badgeLabel = "M365";
    badgeClass = "bg-[var(--accent)]/10 text-[var(--accent)]";
  } else {
    badgeLabel = "Security";
    badgeClass = "bg-[var(--bg-hover)] text-[var(--text-muted)]";
  }

  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-[var(--text-primary)] truncate mr-2">
        {entry.displayName}
      </span>
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${badgeClass}`}
      >
        <Tag className="w-3 h-3" />
        {badgeLabel}
      </span>
    </div>
  );
}

function LicenseCard({ license }: { license: LicenseDetail }) {
  const enabledCount = license.servicePlans.filter(
    (sp) => sp.provisioningStatus === "Success"
  ).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {license.skuPartNumber}
        </span>
        <span className="text-xs text-[var(--text-muted)]">
          {enabledCount}/{license.servicePlans.length} plans active
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {license.servicePlans.map((sp) => (
          <span
            key={sp.servicePlanId}
            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
              sp.provisioningStatus === "Success"
                ? "bg-[var(--success)]/10 text-[var(--success)]"
                : sp.provisioningStatus === "Disabled"
                  ? "bg-[var(--bg-hover)] text-[var(--text-muted)]"
                  : "bg-[var(--warning)]/10 text-[var(--warning)]"
            }`}
            title={`${sp.servicePlanName}: ${sp.provisioningStatus}`}
          >
            {sp.servicePlanName}
          </span>
        ))}
      </div>
    </div>
  );
}

function MailboxCard({ settings }: { settings: MailboxSettings }) {
  return (
    <div className="space-y-2">
      <InfoRow
        icon={<Globe className="w-3.5 h-3.5" />}
        label="Timezone"
        value={settings.timeZone}
      />
      <InfoRow
        icon={<Globe className="w-3.5 h-3.5" />}
        label="Language"
        value={settings.language?.displayName}
      />
      {settings.workingHours && (
        <InfoRow
          icon={<Clock className="w-3.5 h-3.5" />}
          label="Working Hours"
          value={`${settings.workingHours.startTime} - ${settings.workingHours.endTime}`}
        />
      )}
      {settings.automaticRepliesSetting && (
        <InfoRow
          icon={<Mail className="w-3.5 h-3.5" />}
          label="Auto-Reply"
          value={settings.automaticRepliesSetting.status}
        />
      )}
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
          Loading user details...
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
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}
