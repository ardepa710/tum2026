import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  UsersRound,
  ShieldAlert,
  Shield,
  Mail,
  Clock,
  Users,
} from "lucide-react";

export default async function TenantGroupsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenantId = Number(id);

  const [tenant, groups] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { adAgentId: true, adLastSyncAt: true },
    }),
    prisma.adGroup.findMany({
      where: { tenantId },
      orderBy: { displayName: "asc" },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                samAccountName: true,
                accountEnabled: true,
              },
            },
          },
          take: 5,
        },
        _count: { select: { members: true } },
      },
    }),
  ]);

  // Agent not configured
  if (!tenant?.adAgentId) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <UsersRound className="w-6 h-6" style={{ color: "var(--accent)" }} />
          <h3 className="text-xl font-bold text-[var(--text-primary)]">AD Groups</h3>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-14 h-14 bg-[var(--warning)]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7 text-[var(--warning)]" />
          </div>
          <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            SentinelAgent Not Configured
          </h4>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
            Set the <code className="bg-[var(--bg-hover)] px-1 py-0.5 rounded text-xs">adAgentId</code> for
            this tenant to enable AD synchronization.
          </p>
        </div>
      </div>
    );
  }

  // No data yet
  if (groups.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <UsersRound className="w-6 h-6" style={{ color: "var(--accent)" }} />
          <h3 className="text-xl font-bold text-[var(--text-primary)]">AD Groups</h3>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-14 h-14 bg-[var(--accent)]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UsersRound className="w-7 h-7 text-[var(--accent)]" />
          </div>
          <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            No groups synced yet
          </h4>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
            Run the nightly sync to pull groups from Active Directory.
          </p>
        </div>
      </div>
    );
  }

  const securityGroups = groups.filter((g) => g.groupCategory === "Security");
  const distributionGroups = groups.filter((g) => g.groupCategory !== "Security");
  const emptyGroups = groups.filter((g) => g.memberCount === 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <UsersRound className="w-6 h-6" style={{ color: "var(--accent)" }} />
        <h3 className="text-xl font-bold text-[var(--text-primary)]">AD Groups</h3>
        <span className="text-sm text-[var(--text-muted)]">{groups.length} total</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-4 py-3 flex items-center gap-3">
          <Shield className="w-4 h-4 text-[var(--accent)] shrink-0" />
          <div>
            <p className="text-lg font-bold text-[var(--text-primary)]">{securityGroups.length}</p>
            <p className="text-xs text-[var(--text-muted)]">Security Groups</p>
          </div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-4 py-3 flex items-center gap-3">
          <Mail className="w-4 h-4 text-[var(--success)] shrink-0" />
          <div>
            <p className="text-lg font-bold text-[var(--text-primary)]">{distributionGroups.length}</p>
            <p className="text-xs text-[var(--text-muted)]">Distribution</p>
          </div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-4 py-3 flex items-center gap-3">
          <Users className="w-4 h-4 text-[var(--warning)] shrink-0" />
          <div>
            <p className="text-lg font-bold text-[var(--text-primary)]">{emptyGroups.length}</p>
            <p className="text-xs text-[var(--text-muted)]">Empty Groups</p>
          </div>
        </div>
      </div>

      {/* Last sync */}
      {tenant.adLastSyncAt && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-4">
          <Clock className="w-3.5 h-3.5" />
          Last synced: {new Date(tenant.adLastSyncAt).toLocaleString()}
        </div>
      )}

      {/* Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                  Group Name
                </th>
                <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                  Description
                </th>
                <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                  Type / Scope
                </th>
                <th className="text-center text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                  Members
                </th>
                <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                  Member Preview
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {groups.map((group) => (
                <tr key={group.id} className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer">
                  <td className="px-5 py-3">
                    <Link
                      href={`/dashboard/tenants/${tenantId}/groups/${encodeURIComponent(group.samAccountName)}`}
                      className="block group"
                    >
                      <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                        {group.displayName}
                      </p>
                      <p className="text-xs font-mono text-[var(--text-muted)]">
                        {group.samAccountName}
                      </p>
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm text-[var(--text-secondary)] line-clamp-2">
                      {group.description ?? "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-fit
                          ${group.groupCategory === "Security"
                            ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                            : "bg-[var(--success)]/10 text-[var(--success)]"
                          }`}
                      >
                        {group.groupCategory === "Security" ? (
                          <Shield className="w-3 h-3" />
                        ) : (
                          <Mail className="w-3 h-3" />
                        )}
                        {group.groupCategory}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">{group.groupScope}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className={`text-sm font-semibold ${
                        group.memberCount === 0
                          ? "text-[var(--warning)]"
                          : "text-[var(--text-primary)]"
                      }`}
                    >
                      {group.memberCount}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {group.members.slice(0, 3).map(({ user }) => (
                        <span
                          key={user.id}
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            user.accountEnabled
                              ? "bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                              : "bg-[var(--error)]/10 text-[var(--error)]"
                          }`}
                          title={user.samAccountName}
                        >
                          {user.displayName}
                        </span>
                      ))}
                      {group._count.members > 3 && (
                        <span className="text-xs text-[var(--text-muted)] px-1">
                          +{group._count.members - 3} more
                        </span>
                      )}
                      {group.memberCount === 0 && (
                        <span className="text-xs text-[var(--warning)]">Empty group</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
