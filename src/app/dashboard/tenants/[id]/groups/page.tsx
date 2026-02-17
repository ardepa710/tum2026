import { getGroups } from "@/lib/graph";
import {
  UsersRound,
  AlertTriangle,
  ShieldAlert,
  Mail,
  Tag,
} from "lucide-react";

export default async function TenantGroupsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let groups: Array<{
    id: string;
    displayName: string;
    description: string | null;
    mail: string | null;
    groupTypes: string[];
    membershipRule: string | null;
  }> = [];
  let error: string | null = null;

  try {
    groups = await getGroups(id);
  } catch (e) {
    error =
      e instanceof Error
        ? e.message
        : "Failed to fetch groups from Graph API.";
  }

  // Empty result means no config or no groups
  if (!error && groups.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <UsersRound className="w-6 h-6" style={{ color: "var(--accent)" }} />
          <h3 className="text-xl font-bold text-[var(--text-primary)]">
            AD Groups
          </h3>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-14 h-14 bg-[var(--warning)]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7 text-[var(--warning)]" />
          </div>
          <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            No Groups Available
          </h4>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
            Configure Azure credentials for this tenant to view AD groups. Go to
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
          <UsersRound className="w-6 h-6" style={{ color: "var(--accent)" }} />
          <h3 className="text-xl font-bold text-[var(--text-primary)]">
            AD Groups
          </h3>
        </div>
        <div className="bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-[var(--error)]" />
            <div>
              <p className="text-sm font-medium text-[var(--error)]">
                Failed to load groups
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
          <UsersRound className="w-6 h-6" style={{ color: "var(--accent)" }} />
          <h3 className="text-xl font-bold text-[var(--text-primary)]">
            AD Groups
          </h3>
        </div>
        <span className="text-sm text-[var(--text-muted)]">
          {groups.length} group{groups.length !== 1 ? "s" : ""}
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
                  Description
                </th>
                <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                  Mail
                </th>
                <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                  Group Types
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {groups.map((group) => (
                <tr
                  key={group.id}
                  className="hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <td className="px-5 py-3">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {group.displayName}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm text-[var(--text-secondary)] line-clamp-2">
                      {group.description || "\u2014"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {group.mail ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                        <Mail className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        {group.mail}
                      </span>
                    ) : (
                      <span className="text-sm text-[var(--text-muted)]">
                        {"\u2014"}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {group.groupTypes && group.groupTypes.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {group.groupTypes.map((type) => (
                          <span
                            key={type}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]"
                          >
                            <Tag className="w-3 h-3" />
                            {type}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">
                        Security Group
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
