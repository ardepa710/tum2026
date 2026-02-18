import { getUsers } from "@/lib/graph";
import { getLicenses } from "@/lib/graph";
import { getConditionalAccessPolicies } from "@/lib/graph";

const scoreCache = new Map<
  number,
  {
    score: number;
    breakdown: { users: number; licenses: number; policies: number };
    expiresAt: number;
  }
>();
const CACHE_TTL = 3600000; // 1 hour

export async function calculateHealthScore(
  tenantId: number
): Promise<{
  score: number;
  breakdown: { users: number; licenses: number; policies: number };
}> {
  const cached = scoreCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) {
    return { score: cached.score, breakdown: cached.breakdown };
  }

  try {
    const [users, licenses, policies] = await Promise.all([
      getUsers(tenantId),
      getLicenses(tenantId),
      getConditionalAccessPolicies(tenantId),
    ]);

    // Users score (0-40): ratio of enabled accounts
    const totalUsers = users.length || 1;
    const enabledUsers = users.filter((u: any) => u.accountEnabled).length;
    const usersScore = Math.round((enabledUsers / totalUsers) * 40);

    // Licenses score (0-30): average utilization (higher = better use)
    let licensesScore = 15; // default if no licenses
    if (licenses.length > 0) {
      const utilizations = licenses.map((l: any) => {
        const total = l.prepaidUnits?.enabled || 1;
        const consumed = l.consumedUnits || 0;
        return Math.min(consumed / total, 1);
      });
      const avgUtilization =
        utilizations.reduce((a: number, b: number) => a + b, 0) /
        utilizations.length;
      licensesScore = Math.round(avgUtilization * 30);
    }

    // Policies score (0-30): based on active CA policies count
    const activePolicies = policies.filter(
      (p: any) => p.state === "enabled"
    ).length;
    const policiesScore = Math.min(activePolicies * 10, 30);

    const score = usersScore + licensesScore + policiesScore;
    const breakdown = {
      users: usersScore,
      licenses: licensesScore,
      policies: policiesScore,
    };

    scoreCache.set(tenantId, {
      score,
      breakdown,
      expiresAt: Date.now() + CACHE_TTL,
    });

    return { score, breakdown };
  } catch {
    return { score: 0, breakdown: { users: 0, licenses: 0, policies: 0 } };
  }
}
