import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdUserActions } from "@/components/ad/AdUserActions";
import {
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  Lock,
  Clock,
} from "lucide-react";

export default async function TenantUsersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenantId = Number(id);

  const [tenant, users] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { adAgentId: true, adLastSyncAt: true },
    }),
    prisma.adUser.findMany({
      where: { tenantId },
      orderBy: { displayName: "asc" },
    }),
  ]);

  // Agent not configured
  if (!tenant?.adAgentId) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-6 h-6" style={{ color: "var(--accent)" }} />
          <h3 className="text-xl font-bold text-[var(--text-primary)]">AD Users</h3>
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
            this tenant to enable AD synchronization and user management.
          </p>
        </div>
      </div>
    );
  }

  // No data yet
  if (users.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-6 h-6" style={{ color: "var(--accent)" }} />
          <h3 className="text-xl font-bold text-[var(--text-primary)]">AD Users</h3>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-14 h-14 bg-[var(--accent)]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-[var(--accent)]" />
          </div>
          <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            No users synced yet
          </h4>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
            Run the nightly sync to pull users from Active Directory into the local database.
          </p>
        </div>
      </div>
    );
  }

  const enabledCount = users.filter((u) => u.accountEnabled).length;
  const disabledCount = users.length - enabledCount;
  const lockedCount = users.filter((u) => u.lockedOut).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Users className="w-6 h-6" style={{ color: "var(--accent)" }} />
        <h3 className="text-xl font-bold text-[var(--text-primary)]">AD Users</h3>
        <span className="text-sm text-[var(--text-muted)]">{users.length} total</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-4 py-3 flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-[var(--success)] shrink-0" />
          <div>
            <p className="text-lg font-bold text-[var(--text-primary)]">{enabledCount}</p>
            <p className="text-xs text-[var(--text-muted)]">Enabled</p>
          </div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-4 py-3 flex items-center gap-3">
          <XCircle className="w-4 h-4 text-[var(--error)] shrink-0" />
          <div>
            <p className="text-lg font-bold text-[var(--text-primary)]">{disabledCount}</p>
            <p className="text-xs text-[var(--text-muted)]">Disabled</p>
          </div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-4 py-3 flex items-center gap-3">
          <Lock className="w-4 h-4 text-[var(--warning)] shrink-0" />
          <div>
            <p className="text-lg font-bold text-[var(--text-primary)]">{lockedCount}</p>
            <p className="text-xs text-[var(--text-muted)]">Locked Out</p>
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
                  Display Name
                </th>
                <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                  SAM / Email
                </th>
                <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                  Department
                </th>
                <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                  Last Logon
                </th>
                <th className="text-center text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                  Status
                </th>
                <th className="text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer">
                  <td className="px-5 py-3">
                    <Link
                      href={`/dashboard/tenants/${tenantId}/users/${encodeURIComponent(user.samAccountName)}`}
                      className="block group"
                    >
                      <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                        {user.displayName}
                      </span>
                      {user.jobTitle && (
                        <p className="text-xs text-[var(--text-muted)]">{user.jobTitle}</p>
                      )}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-xs font-mono text-[var(--text-secondary)]">
                      {user.samAccountName}
                    </p>
                    {user.mail && (
                      <p className="text-xs text-[var(--text-muted)]">{user.mail}</p>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm text-[var(--text-secondary)]">
                      {user.department ?? "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-[var(--text-muted)]">
                      {user.lastLogonDate
                        ? new Date(user.lastLogonDate).toLocaleDateString()
                        : "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col items-center gap-1">
                      {user.accountEnabled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--success)]/10 text-[var(--success)]">
                          <CheckCircle2 className="w-3 h-3" />
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--error)]/10 text-[var(--error)]">
                          <XCircle className="w-3 h-3" />
                          Disabled
                        </span>
                      )}
                      {user.lockedOut && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--warning)]/10 text-[var(--warning)]">
                          <Lock className="w-3 h-3" />
                          Locked
                        </span>
                      )}
                      {user.passwordExpired && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--warning)]/10 text-[var(--warning)]">
                          <AlertTriangle className="w-3 h-3" />
                          Pwd Expired
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <AdUserActions
                      tenantId={tenantId}
                      samAccountName={user.samAccountName}
                      accountEnabled={user.accountEnabled}
                      lockedOut={user.lockedOut}
                    />
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
