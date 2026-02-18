import { getConditionalAccessPolicies } from "@/lib/graph";
import {
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

interface ConditionalAccessPolicy {
  id: string;
  displayName: string;
  state: string;
  conditions: {
    users?: {
      includeUsers?: string[];
      includeGroups?: string[];
    };
    applications?: {
      includeApplications?: string[];
    };
  };
  grantControls?: {
    builtInControls?: string[];
  };
}

function getStateBadge(state: string) {
  switch (state) {
    case "enabled":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--success)]/15 text-[var(--success)]">
          Enabled
        </span>
      );
    case "disabled":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-hover)] text-[var(--text-muted)]">
          Disabled
        </span>
      );
    case "enabledForReportingButNotEnforced":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--warning)]/15 text-[var(--warning)]">
          Report Only
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-hover)] text-[var(--text-muted)]">
          {state}
        </span>
      );
  }
}

function getConditionsSummary(conditions: ConditionalAccessPolicy["conditions"]) {
  const parts: string[] = [];

  if (conditions.users?.includeUsers?.includes("All")) {
    parts.push("All users");
  } else {
    const userCount = conditions.users?.includeUsers?.length ?? 0;
    const groupCount = conditions.users?.includeGroups?.length ?? 0;
    if (userCount > 0) parts.push(`${userCount} user${userCount !== 1 ? "s" : ""}`);
    if (groupCount > 0) parts.push(`${groupCount} group${groupCount !== 1 ? "s" : ""}`);
  }

  if (conditions.applications?.includeApplications?.includes("All")) {
    parts.push("All apps");
  } else {
    const appCount = conditions.applications?.includeApplications?.length ?? 0;
    if (appCount > 0) parts.push(`${appCount} app${appCount !== 1 ? "s" : ""}`);
  }

  return parts.length > 0 ? parts.join(", ") : "\u2014";
}

export default async function TenantPoliciesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let policies: ConditionalAccessPolicy[] = [];
  let error: string | null = null;

  try {
    policies = await getConditionalAccessPolicies(Number(id));
  } catch (e) {
    error =
      e instanceof Error
        ? e.message
        : "Failed to fetch conditional access policies from Graph API.";
  }

  // Empty result means no config or no policies
  if (!error && policies.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="w-6 h-6" style={{ color: "var(--accent)" }} />
          <h3 className="text-xl font-bold text-[var(--text-primary)]">
            Conditional Access Policies
          </h3>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-14 h-14 bg-[var(--accent)]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7 text-[var(--accent)]" />
          </div>
          <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            No Policies Found
          </h4>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
            No conditional access policies are configured for this tenant, or
            Azure credentials need to be set up. Go to the Overview tab and
            ensure the Azure Tenant ID, Client ID, and Client Secret are set.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="w-6 h-6" style={{ color: "var(--accent)" }} />
          <h3 className="text-xl font-bold text-[var(--text-primary)]">
            Conditional Access Policies
          </h3>
        </div>
        <div className="bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-[var(--error)]" />
            <div>
              <p className="text-sm font-medium text-[var(--error)]">
                Failed to load policies
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
          <ShieldCheck className="w-6 h-6" style={{ color: "var(--accent)" }} />
          <h3 className="text-xl font-bold text-[var(--text-primary)]">
            Conditional Access Policies
          </h3>
        </div>
        <span className="text-sm text-[var(--text-muted)]">
          {policies.length} polic{policies.length !== 1 ? "ies" : "y"}
        </span>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                  Name
                </th>
                <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                  State
                </th>
                <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                  Conditions Summary
                </th>
                <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                  Grant Controls
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {policies.map((policy) => (
                <tr
                  key={policy.id}
                  className="hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <td className="px-5 py-3">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {policy.displayName}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {getStateBadge(policy.state)}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm text-[var(--text-secondary)]">
                      {getConditionsSummary(policy.conditions)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm text-[var(--text-secondary)]">
                      {policy.grantControls?.builtInControls?.join(", ") || "\u2014"}
                    </span>
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
