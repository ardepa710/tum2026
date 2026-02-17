import { getUsers } from "@/lib/graph";
import {
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";

export default async function TenantUsersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let users: Array<{
    id: string;
    displayName: string;
    mail: string | null;
    userPrincipalName: string;
    accountEnabled: boolean;
    jobTitle: string | null;
    department: string | null;
  }> = [];
  let error: string | null = null;

  try {
    users = await getUsers(Number(id));
  } catch (e) {
    error =
      e instanceof Error ? e.message : "Failed to fetch users from Graph API.";
  }

  // Empty result means no config or no users
  if (!error && users.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-6 h-6" style={{ color: "var(--accent)" }} />
          <h3 className="text-xl font-bold text-[var(--text-primary)]">
            AD Users
          </h3>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-14 h-14 bg-[var(--warning)]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7 text-[var(--warning)]" />
          </div>
          <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            No Users Available
          </h4>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
            Configure Azure credentials for this tenant to view AD users. Go to
            the Overview tab and ensure the Azure Tenant ID, Client ID, and
            Client Secret are set.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-6 h-6" style={{ color: "var(--accent)" }} />
          <h3 className="text-xl font-bold text-[var(--text-primary)]">
            AD Users
          </h3>
        </div>
        <div className="bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-[var(--error)]" />
            <div>
              <p className="text-sm font-medium text-[var(--error)]">
                Failed to load users
              </p>
              <p className="text-xs text-[var(--error)]/70 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6" style={{ color: "var(--accent)" }} />
          <h3 className="text-xl font-bold text-[var(--text-primary)]">
            AD Users
          </h3>
        </div>
        <span className="text-sm text-[var(--text-muted)]">
          {users.length} user{users.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                  Display Name
                </th>
                <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                  Email / UPN
                </th>
                <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                  Job Title
                </th>
                <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                  Department
                </th>
                <th className="text-center text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <td className="px-5 py-3">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {user.displayName}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm text-[var(--text-secondary)]">
                      {user.mail || user.userPrincipalName}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm text-[var(--text-secondary)]">
                      {user.jobTitle || "\u2014"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm text-[var(--text-secondary)]">
                      {user.department || "\u2014"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
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
