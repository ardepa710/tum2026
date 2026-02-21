import { getLicenses } from "@/lib/graph";
import type {
  LicenseRecommendation,
  OptimizationSummary,
} from "@/lib/types/license-optimization";

const SKU_PRICES: Record<string, { friendlyName: string; price: number }> = {
  ENTERPRISEPACK: { friendlyName: "Office 365 E3", price: 36 },
  SPE_E3: { friendlyName: "Microsoft 365 E3", price: 36 },
  SPE_E5: { friendlyName: "Microsoft 365 E5", price: 57 },
  ENTERPRISEPREMIUM: { friendlyName: "Office 365 E5", price: 38 },
  O365_BUSINESS_ESSENTIALS: { friendlyName: "Microsoft 365 Business Basic", price: 6 },
  O365_BUSINESS_PREMIUM: { friendlyName: "Microsoft 365 Business Standard", price: 12.5 },
  SMB_BUSINESS_PREMIUM: { friendlyName: "Microsoft 365 Business Premium", price: 22 },
  EXCHANGESTANDARD: { friendlyName: "Exchange Online Plan 1", price: 4 },
  EXCHANGEENTERPRISE: { friendlyName: "Exchange Online Plan 2", price: 8 },
  POWER_BI_PRO: { friendlyName: "Power BI Pro", price: 10 },
  POWER_BI_PREMIUM_PER_USER: { friendlyName: "Power BI Premium Per User", price: 20 },
  PROJECTPREMIUM: { friendlyName: "Project Plan 5", price: 55 },
  PROJECTPROFESSIONAL: { friendlyName: "Project Plan 3", price: 30 },
  VISIOCLIENT: { friendlyName: "Visio Plan 2", price: 15 },
  ATP_ENTERPRISE: { friendlyName: "Microsoft Defender for Office 365 P1", price: 2 },
  THREAT_INTELLIGENCE: { friendlyName: "Microsoft Defender for Office 365 P2", price: 5 },
  EMS_E3: { friendlyName: "Enterprise Mobility + Security E3", price: 10.6 },
  EMS_E5: { friendlyName: "Enterprise Mobility + Security E5", price: 16 },
  TEAMS_EXPLORATORY: { friendlyName: "Teams Exploratory", price: 0 },
  FLOW_FREE: { friendlyName: "Power Automate Free", price: 0 },
  POWER_APPS_VIRAL: { friendlyName: "Power Apps Trial", price: 0 },
  STREAM: { friendlyName: "Microsoft Stream", price: 0 },
  MICROSOFT_BUSINESS_CENTER: { friendlyName: "Microsoft Business Center", price: 0 },
};

export function formatSkuName(skuPartNumber: string): string {
  const entry = SKU_PRICES[skuPartNumber];
  if (entry) return entry.friendlyName;
  return skuPartNumber.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getSkuPrice(skuPartNumber: string): number {
  return SKU_PRICES[skuPartNumber]?.price ?? 0;
}

// In-memory cache with 1hr TTL
let cache: { data: OptimizationSummary; expiresAt: number } | null = null;
const CACHE_TTL = 3600000; // 1 hour

export async function analyzeOptimization(
  tenants: { id: number; tenantAbbrv: string; tenantIdMsft: string }[]
): Promise<OptimizationSummary> {
  if (cache && cache.expiresAt > Date.now()) return cache.data;

  const recommendations: LicenseRecommendation[] = [];
  const failedTenants: string[] = [];
  let analyzedSkus = 0;

  const results = await Promise.allSettled(
    tenants.map(async (tenant) => {
      try {
        const licenses = await getLicenses(tenant.id);
        return { tenant, licenses, failed: false };
      } catch {
        return { tenant, licenses: [], failed: true };
      }
    })
  );

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const { tenant, licenses, failed } = result.value;
    if (failed) {
      failedTenants.push(tenant.tenantAbbrv);
      continue;
    }

    for (const license of licenses) {
      const enabled = license.prepaidUnits?.enabled ?? 0;
      const consumed = license.consumedUnits ?? 0;
      if (enabled === 0) continue;

      analyzedSkus++;
      const price = getSkuPrice(license.skuPartNumber);
      if (price === 0) continue; // Skip free SKUs

      const utilizationPct = Math.round((consumed / enabled) * 100);
      const unusedCount = enabled - consumed;

      if (utilizationPct >= 80) continue; // Well-utilized, skip

      const estimatedWastePerMonth = unusedCount * price;
      const severity: "review" | "wasteful" =
        utilizationPct < 50 ? "wasteful" : "review";

      recommendations.push({
        tenantAbbrv: tenant.tenantAbbrv,
        tenantId: tenant.id,
        skuPartNumber: license.skuPartNumber,
        friendlyName: formatSkuName(license.skuPartNumber),
        totalEnabled: enabled,
        totalConsumed: consumed,
        unusedCount,
        utilizationPct,
        estimatedWastePerMonth,
        severity,
        recommendation: `${unusedCount} unused licenses (~$${estimatedWastePerMonth.toFixed(0)}/mo waste). Consider reducing allocation.`,
      });
    }
  }

  // Sort by waste descending
  recommendations.sort((a, b) => b.estimatedWastePerMonth - a.estimatedWastePerMonth);

  const totalEstimatedWaste = recommendations.reduce(
    (sum, r) => sum + r.estimatedWastePerMonth,
    0
  );

  const summary: OptimizationSummary = {
    totalEstimatedWaste,
    recommendations,
    analyzedTenants: tenants.length,
    analyzedSkus,
    failedTenants,
  };

  cache = { data: summary, expiresAt: Date.now() + CACHE_TTL };
  return summary;
}
