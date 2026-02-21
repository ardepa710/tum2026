import {
  getUsers,
  getConditionalAccessPolicies,
  getDirectoryRoles,
  getDirectoryRoleMembers,
} from "@/lib/graph";
import type { SecurityCheck, SecurityScoreResult } from "@/lib/types/security";

const scoreCache = new Map<
  number,
  { result: SecurityScoreResult; expiresAt: number }
>();
const CACHE_TTL = 3600000; // 1 hour

export function clearScoreCache(tenantId: number) {
  scoreCache.delete(tenantId);
}

const GLOBAL_ADMIN_ROLE_TEMPLATE = "62e90394-69f5-4237-9190-012177145e10";

export async function calculateSecurityScore(
  tenantId: number,
  tenantAbbrv: string,
): Promise<SecurityScoreResult> {
  const cached = scoreCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  const checks: SecurityCheck[] = [];

  const [users, policies, roles] = await Promise.allSettled([
    getUsers(tenantId),
    getConditionalAccessPolicies(tenantId),
    getDirectoryRoles(tenantId),
  ]);

  const userList = users.status === "fulfilled" ? users.value : [];
  const policyList = policies.status === "fulfilled" ? policies.value : [];
  const roleList = roles.status === "fulfilled" ? roles.value : [];

  // Check 1: Conditional Access Policies (weight 25)
  const activePolicies = policyList.filter(
    (p: Record<string, unknown>) => p.state === "enabled",
  );
  const caScore = Math.min(activePolicies.length * 8, 25);
  checks.push({
    id: "ca_policies",
    name: "Conditional Access Policies",
    description: "Active CA policies protect against unauthorized access",
    category: "Access Control",
    weight: 25,
    status:
      activePolicies.length >= 3
        ? "pass"
        : activePolicies.length >= 1
          ? "warning"
          : "fail",
    score: caScore,
    details: `${activePolicies.length} active CA policies`,
  });

  // Check 2: Global Admin Count (weight 20)
  const gaRole = roleList.find(
    (r: Record<string, unknown>) =>
      r.roleTemplateId === GLOBAL_ADMIN_ROLE_TEMPLATE,
  );
  let gaCount = 0;
  if (gaRole) {
    const members = await getDirectoryRoleMembers(
      tenantId,
      gaRole.id as string,
    );
    gaCount = members.length;
  }
  const gaScore = gaCount <= 5 ? 20 : gaCount <= 8 ? 12 : 5;
  checks.push({
    id: "global_admins",
    name: "Global Administrator Count",
    description: "Fewer Global Admins reduces attack surface",
    category: "Privileged Access",
    weight: 20,
    status: gaCount <= 5 ? "pass" : gaCount <= 8 ? "warning" : "fail",
    score: gaScore,
    details: `${gaCount} Global Admins`,
  });

  // Check 3: Disabled Accounts Ratio (weight 15)
  const totalUsers = userList.length || 1;
  const disabledCount = userList.filter(
    (u: Record<string, unknown>) => !u.accountEnabled,
  ).length;
  const disabledRatio = disabledCount / totalUsers;
  const disabledScore = disabledRatio < 0.2 ? 15 : disabledRatio < 0.4 ? 10 : 5;
  checks.push({
    id: "disabled_ratio",
    name: "Disabled Accounts Ratio",
    description: "High ratio of disabled accounts may indicate stale accounts",
    category: "Account Hygiene",
    weight: 15,
    status:
      disabledRatio < 0.2 ? "pass" : disabledRatio < 0.4 ? "warning" : "fail",
    score: disabledScore,
    details: `${disabledCount}/${totalUsers} disabled (${Math.round(disabledRatio * 100)}%)`,
  });

  // Check 4: Guest User Ratio (weight 15)
  const guestCount = userList.filter(
    (u: Record<string, unknown>) =>
      typeof u.userPrincipalName === "string" &&
      u.userPrincipalName.includes("#EXT#"),
  ).length;
  const guestRatio = guestCount / totalUsers;
  const guestScore = guestRatio < 0.3 ? 15 : guestRatio < 0.5 ? 10 : 5;
  checks.push({
    id: "guest_ratio",
    name: "Guest User Ratio",
    description: "High guest count increases external access risk",
    category: "External Access",
    weight: 15,
    status:
      guestRatio < 0.3 ? "pass" : guestRatio < 0.5 ? "warning" : "fail",
    score: guestScore,
    details: `${guestCount} guests (${Math.round(guestRatio * 100)}%)`,
  });

  // Check 5: MFA Enforcement (weight 10)
  const mfaPolicies = activePolicies.filter(
    (p: Record<string, unknown>) => {
      const gc = p.grantControls as Record<string, unknown> | null;
      const builtIn = gc?.builtInControls as string[] | undefined;
      return builtIn?.includes("mfa");
    },
  );
  const mfaScore = mfaPolicies.length > 0 ? 10 : 0;
  checks.push({
    id: "mfa_enforcement",
    name: "MFA Enforcement",
    description: "MFA should be enforced via Conditional Access",
    category: "Authentication",
    weight: 10,
    status: mfaPolicies.length > 0 ? "pass" : "fail",
    score: mfaScore,
    details: `${mfaPolicies.length} CA policies enforce MFA`,
  });

  // Check 6: Security Baseline (weight 15)
  const hasSecurityBaseline = policyList.length > 0;
  const baselineScore = hasSecurityBaseline ? 15 : 0;
  checks.push({
    id: "security_baseline",
    name: "Security Baseline",
    description: "At least one CA policy should exist as security baseline",
    category: "Baseline",
    weight: 15,
    status: hasSecurityBaseline ? "pass" : "fail",
    score: baselineScore,
    details: hasSecurityBaseline
      ? "CA policies configured"
      : "No CA policies found",
  });

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const result: SecurityScoreResult = {
    tenantId,
    tenantAbbrv,
    totalScore,
    checks,
  };

  scoreCache.set(tenantId, { result, expiresAt: Date.now() + CACHE_TTL });
  return result;
}
