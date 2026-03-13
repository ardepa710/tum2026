import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdGroupMemberActions } from "@/components/ad/AdGroupMemberActions";
import {
  ArrowLeft,
  Shield,
  Mail,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Fingerprint,
} from "lucide-react";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string; name: string }>;
}) {
  const { id, name } = await params;
  const tenantId = Number(id);
  const samAccountName = decodeURIComponent(name);

  const group = await prisma.adGroup.findUnique({
    where: { tenantId_samAccountName: { tenantId, samAccountName } },
  });

  if (!group) notFound();

  const memberRecords = await prisma.adGroupMember.findMany({
    where: { tenantId, groupSam: samAccountName },
  });

  const members = memberRecords.length > 0
    ? await prisma.adUser.findMany({
        where: { tenantId, samAccountName: { in: memberRecords.map((m) => m.userSam) } },
        select: {
          id: true,
          displayName: true,
          samAccountName: true,
          department: true,
          accountEnabled: true,
        },
        orderBy: { displayName: "asc" },
      })
    : [];

  const isSecurity = group.groupCategory === "Security";

  return (
    <div>
      {/* Back link */}
      <Link
        href={`/dashboard/tenants/${tenantId}/groups`}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors mb-5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to AD Groups
      </Link>

      {/* Group header */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 mb-5">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
            isSecurity ? "bg-[var(--accent)]/15" : "bg-[var(--success)]/15"
          }`}>
            {isSecurity ? (
              <Shield className="w-7 h-7 text-[var(--accent)]" />
            ) : (
              <Mail className="w-7 h-7 text-[var(--success)]" />
            )}
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">{group.displayName}</h2>
            <p className="text-sm font-mono text-[var(--text-muted)] mt-0.5">{group.samAccountName}</p>
            {group.description && (
              <p className="text-sm text-[var(--text-secondary)] mt-1">{group.description}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                isSecurity
                  ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "bg-[var(--success)]/10 text-[var(--success)]"
              }`}>
                {isSecurity ? <Shield className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
                {group.groupCategory}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-hover)] text-[var(--text-muted)]">
                {group.groupScope}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-hover)] text-[var(--text-muted)]">
                <Users className="w-3 h-3" />
                {group.memberCount} members
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Group Info (1/3) ── */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[var(--border)] bg-[var(--bg-hover)]/40">
            <Shield className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Group Info</h3>
          </div>
          <div className="divide-y divide-[var(--border)]">
            <InfoRow label="Category">
              <span className={`text-sm font-medium ${isSecurity ? "text-[var(--accent)]" : "text-[var(--success)]"}`}>
                {group.groupCategory}
              </span>
            </InfoRow>
            <InfoRow label="Scope">
              <span className="text-sm">{group.groupScope}</span>
            </InfoRow>
            <InfoRow label="Member Count">
              <span className={`text-sm font-semibold ${group.memberCount === 0 ? "text-[var(--warning)]" : "text-[var(--text-primary)]"}`}>
                {group.memberCount}
              </span>
            </InfoRow>
            {group.description && (
              <InfoRow label="Description">
                <span className="text-sm text-[var(--text-muted)]">{group.description}</span>
              </InfoRow>
            )}
            <InfoRow label="SAM Account">
              <span className="text-xs font-mono text-[var(--text-muted)]">{group.samAccountName}</span>
            </InfoRow>
            <InfoRow label="Last Synced">
              <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                <Clock className="w-3 h-3" />
                {new Date(group.syncedAt).toLocaleString()}
              </div>
            </InfoRow>
          </div>
        </div>

        {/* ── Members (2/3) ── */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[var(--border)] bg-[var(--bg-hover)]/40">
            <Users className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Members ({members.length})
            </h3>
            <div className="ml-auto flex items-center gap-3 text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[var(--success)]" />
                {members.filter((u) => u.accountEnabled).length} enabled
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="w-3 h-3 text-[var(--error)]" />
                {members.filter((u) => !u.accountEnabled).length} disabled
              </span>
            </div>
          </div>

          <div className="p-4">
            <AdGroupMemberActions
              tenantId={tenantId}
              groupSam={group.samAccountName}
              members={members}
            />
          </div>

          {/* Members table for larger groups — visible in members area */}
          {members.length > 0 && (
            <div className="border-t border-[var(--border)] overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-2.5">
                      Member
                    </th>
                    <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-2.5">
                      Department
                    </th>
                    <th className="text-center text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-2.5">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-2.5">
                      <Fingerprint className="w-3.5 h-3.5 inline" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {members.map((user) => (
                    <tr key={user.samAccountName} className="hover:bg-[var(--bg-hover)] transition-colors">
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/dashboard/tenants/${tenantId}/users/${encodeURIComponent(user.samAccountName)}`}
                          className="block group"
                        >
                          <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                            {user.displayName}
                          </p>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-sm text-[var(--text-secondary)]">
                          {user.department ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {user.accountEnabled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--success)]/10 text-[var(--success)]">
                            <CheckCircle2 className="w-3 h-3" /> Enabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--error)]/10 text-[var(--error)]">
                            <XCircle className="w-3 h-3" /> Disabled
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs font-mono text-[var(--text-muted)]">
                          {user.samAccountName}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5">
      <span className="text-xs text-[var(--text-muted)] w-28 shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
