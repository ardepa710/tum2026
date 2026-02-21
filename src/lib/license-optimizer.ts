import { getLicenses } from "@/lib/graph";
import { formatSkuName, getSkuPrice } from "@/lib/sku-prices";
import type {
  LicenseRecommendation,
  OptimizationSummary,
} from "@/lib/types/license-optimization";

export { formatSkuName } from "@/lib/sku-prices";

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
