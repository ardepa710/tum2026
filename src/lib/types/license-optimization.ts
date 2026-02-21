export interface SkuPriceEntry {
  skuPartNumber: string;
  friendlyName: string;
  monthlyPricePerUser: number;
}

export interface LicenseRecommendation {
  tenantAbbrv: string;
  tenantId: number;
  skuPartNumber: string;
  friendlyName: string;
  totalEnabled: number;
  totalConsumed: number;
  unusedCount: number;
  utilizationPct: number;
  estimatedWastePerMonth: number;
  severity: "optimized" | "review" | "wasteful";
  recommendation: string;
}

export interface OptimizationSummary {
  totalEstimatedWaste: number;
  recommendations: LicenseRecommendation[];
  analyzedTenants: number;
  analyzedSkus: number;
}
