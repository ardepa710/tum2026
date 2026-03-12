import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdUserActions } from "@/components/ad/AdUserActions";
import {
  getUserDetail,
  getUserMemberOf,
  getUserLicenseDetails,
  getUserMailboxSettings,
  getUserManager,
} from "@/lib/graph";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Lock,
  AlertTriangle,
  User,
  Building2,
  Phone,
  Mail,
  Key,
  Calendar,
  Clock,
  Shield,
  CloudOff,
  Package,
  UsersRound,
  Fingerprint,
} from "lucide-react";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string; sam: string }>;
}) {
  const { id, sam } = await params;
  const tenantId = Number(id);
  const samAccountName = decodeURIComponent(sam);

  const adUser = await prisma.adUser.findUnique({
    where: { tenantId_samAccountName: { tenantId, samAccountName } },
  });

  if (!adUser) notFound();

  // Fetch M365 data in parallel using the UPN (Graph supports UPN-based lookups)
  const [userDetailRes, memberOfRes, licensesRes, mailboxRes, managerRes] =
    await Promise.allSettled([
      getUserDetail(tenantId, adUser.upn),
      getUserMemberOf(tenantId, adUser.upn),
      getUserLicenseDetails(tenantId, adUser.upn),
      getUserMailboxSettings(tenantId, adUser.upn),
      getUserManager(tenantId, adUser.upn),
    ]);

  const m365User = userDetailRes.status === "fulfilled" ? userDetailRes.value : null;
  const m365Groups = memberOfRes.status === "fulfilled" ? (memberOfRes.value ?? []) : [];
  const m365Licenses = licensesRes.status === "fulfilled" ? (licensesRes.value ?? []) : [];
  const m365Mailbox = mailboxRes.status === "fulfilled" ? mailboxRes.value : null;
  const m365Manager = managerRes.status === "fulfilled" ? managerRes.value : null;

  // Check if M365 is configured for this tenant
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { tenantIdMsft: true },
  });
  const m365Configured = !!tenant?.tenantIdMsft;

  const initials = adUser.displayName
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div>
      {/* Back link */}
      <Link
        href={`/dashboard/tenants/${tenantId}/users`}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors mb-5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to AD Users
      </Link>

      {/* User header */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-2xl bg-[var(--accent)]/15 flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-[var(--accent)]">{initials}</span>
            </div>
            {/* Name + info */}
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{adUser.displayName}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-[var(--text-muted)]">
                {adUser.jobTitle && <span>{adUser.jobTitle}</span>}
                {adUser.jobTitle && adUser.department && (
                  <span className="text-[var(--border)]">·</span>
                )}
                {adUser.department && <span>{adUser.department}</span>}
                {adUser.building && (
                  <>
                    <span className="text-[var(--border)]">·</span>
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {adUser.building}
                    </span>
                  </>
                )}
              </div>
              {/* Status badges */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {adUser.accountEnabled ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--success)]/10 text-[var(--success)]">
                    <CheckCircle2 className="w-3 h-3" /> Enabled
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--error)]/10 text-[var(--error)]">
                    <XCircle className="w-3 h-3" /> Disabled
                  </span>
                )}
                {adUser.lockedOut && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--warning)]/10 text-[var(--warning)]">
                    <Lock className="w-3 h-3" /> Locked Out
                  </span>
                )}
                {adUser.passwordExpired && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--warning)]/10 text-[var(--warning)]">
                    <AlertTriangle className="w-3 h-3" /> Password Expired
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Actions */}
          <div className="shrink-0">
            <AdUserActions
              tenantId={tenantId}
              samAccountName={adUser.samAccountName}
              accountEnabled={adUser.accountEnabled}
              lockedOut={adUser.lockedOut}
            />
          </div>
        </div>
      </div>

      {/* Two-column detail grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Active Directory ── */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[var(--border)] bg-[var(--bg-hover)]/40">
            <Shield className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Active Directory</h3>
          </div>
          <div className="divide-y divide-[var(--border)]">
            <DetailRow label="SAM Account" icon={<User className="w-3.5 h-3.5" />}>
              <span className="font-mono text-sm">{adUser.samAccountName}</span>
            </DetailRow>
            <DetailRow label="UPN" icon={<Mail className="w-3.5 h-3.5" />}>
              <span className="text-sm break-all">{adUser.upn}</span>
            </DetailRow>
            {adUser.mail && adUser.mail !== adUser.upn && (
              <DetailRow label="Email" icon={<Mail className="w-3.5 h-3.5" />}>
                <span className="text-sm">{adUser.mail}</span>
              </DetailRow>
            )}
            {adUser.mobilePhone && (
              <DetailRow label="Mobile" icon={<Phone className="w-3.5 h-3.5" />}>
                <span className="text-sm">{adUser.mobilePhone}</span>
              </DetailRow>
            )}
            {adUser.manager && (
              <DetailRow label="Manager" icon={<User className="w-3.5 h-3.5" />}>
                <span className="text-sm">{adUser.manager}</span>
              </DetailRow>
            )}
            {adUser.description && (
              <DetailRow label="Description" icon={<User className="w-3.5 h-3.5" />}>
                <span className="text-sm text-[var(--text-muted)]">{adUser.description}</span>
              </DetailRow>
            )}
            <DetailRow label="Last Logon" icon={<Clock className="w-3.5 h-3.5" />}>
              <span className="text-sm">
                {adUser.lastLogonDate
                  ? new Date(adUser.lastLogonDate).toLocaleString()
                  : <span className="text-[var(--text-muted)]">Never / Unknown</span>}
              </span>
            </DetailRow>
            <DetailRow label="Password Last Set" icon={<Key className="w-3.5 h-3.5" />}>
              <span className="text-sm">
                {adUser.passwordLastSet
                  ? new Date(adUser.passwordLastSet).toLocaleDateString()
                  : <span className="text-[var(--text-muted)]">—</span>}
              </span>
            </DetailRow>
            <DetailRow label="Created in AD" icon={<Calendar className="w-3.5 h-3.5" />}>
              <span className="text-sm">
                {adUser.createdInAd
                  ? new Date(adUser.createdInAd).toLocaleDateString()
                  : <span className="text-[var(--text-muted)]">—</span>}
              </span>
            </DetailRow>
            {adUser.objectGuid && (
              <DetailRow label="Object GUID" icon={<Fingerprint className="w-3.5 h-3.5" />}>
                <span className="font-mono text-xs text-[var(--text-muted)] break-all">{adUser.objectGuid}</span>
              </DetailRow>
            )}
            {adUser.distinguishedName && (
              <DetailRow label="Distinguished Name" icon={<Shield className="w-3.5 h-3.5" />}>
                <span className="font-mono text-xs text-[var(--text-muted)] break-all">{adUser.distinguishedName}</span>
              </DetailRow>
            )}
            <DetailRow label="AD Sync" icon={<Clock className="w-3.5 h-3.5" />}>
              <span className="text-xs text-[var(--text-muted)]">
                {new Date(adUser.syncedAt).toLocaleString()}
              </span>
            </DetailRow>
          </div>
        </div>

        {/* ── Microsoft 365 ── */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[var(--border)] bg-[var(--bg-hover)]/40">
            <Package className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Microsoft 365</h3>
          </div>

          {!m365Configured ? (
            <div className="p-6 text-center">
              <CloudOff className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-sm text-[var(--text-muted)]">
                Microsoft 365 not configured for this tenant.
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Set <code className="bg-[var(--bg-hover)] px-1 rounded">tenantIdMsft</code> to enable Graph API data.
              </p>
            </div>
          ) : !m365User ? (
            <div className="p-6 text-center">
              <CloudOff className="w-8 h-8 text-[var(--warning)] mx-auto mb-2" />
              <p className="text-sm text-[var(--text-muted)]">
                User not found in Microsoft 365.
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">UPN: {adUser.upn}</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {/* Account status in M365 */}
              <DetailRow label="M365 Account" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
                {m365User.accountEnabled ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--success)]/10 text-[var(--success)]">
                    <CheckCircle2 className="w-3 h-3" /> Enabled
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--error)]/10 text-[var(--error)]">
                    <XCircle className="w-3 h-3" /> Disabled
                  </span>
                )}
              </DetailRow>

              {/* Manager from M365 */}
              {m365Manager && (
                <DetailRow label="Manager (M365)" icon={<User className="w-3.5 h-3.5" />}>
                  <div>
                    <p className="text-sm">{m365Manager.displayName}</p>
                    {m365Manager.jobTitle && (
                      <p className="text-xs text-[var(--text-muted)]">{m365Manager.jobTitle}</p>
                    )}
                    {m365Manager.mail && (
                      <p className="text-xs text-[var(--text-muted)]">{m365Manager.mail}</p>
                    )}
                  </div>
                </DetailRow>
              )}

              {/* Last password change */}
              {m365User.lastPasswordChangeDateTime && (
                <DetailRow label="Last Pwd Change" icon={<Key className="w-3.5 h-3.5" />}>
                  <span className="text-sm">
                    {new Date(m365User.lastPasswordChangeDateTime).toLocaleDateString()}
                  </span>
                </DetailRow>
              )}

              {/* Last sign-in */}
              {m365User.signInActivity?.lastSignInDateTime && (
                <DetailRow label="Last Sign-in" icon={<Clock className="w-3.5 h-3.5" />}>
                  <span className="text-sm">
                    {new Date(m365User.signInActivity.lastSignInDateTime).toLocaleString()}
                  </span>
                </DetailRow>
              )}

              {/* Mailbox timezone */}
              {m365Mailbox?.timeZone && (
                <DetailRow label="Mailbox Timezone" icon={<Clock className="w-3.5 h-3.5" />}>
                  <span className="text-sm">{m365Mailbox.timeZone}</span>
                </DetailRow>
              )}

              {/* Licenses */}
              <div className="px-4 py-3">
                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" /> Licenses ({m365Licenses.length})
                </p>
                {m365Licenses.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">No licenses assigned</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {m365Licenses.map((lic: any) => (
                      <span
                        key={lic.skuId}
                        className="text-xs px-2 py-1 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] font-medium"
                        title={lic.skuId}
                      >
                        {formatSkuName(lic.skuPartNumber ?? lic.skuId)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* M365 Group memberships */}
              {m365Groups.length > 0 && (
                <div className="px-4 py-3">
                  <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <UsersRound className="w-3.5 h-3.5" /> M365 Groups ({m365Groups.length})
                  </p>
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {m365Groups.map((g: any) => (
                      <span
                        key={g.id}
                        className="text-xs text-[var(--text-secondary)] py-0.5"
                      >
                        {g.displayName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──

function DetailRow({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5">
      <div className="flex items-center gap-1.5 w-36 shrink-0 pt-0.5 text-[var(--text-muted)]">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

/** Convert ugly SKU names like "ENTERPRISEPREMIUM" to "Enterprise Premium" */
function formatSkuName(skuPartNumber: string): string {
  return skuPartNumber
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
