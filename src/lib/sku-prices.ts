/** SKU price map and display-name formatter — safe to import from client components */

export const SKU_PRICES: Record<string, { friendlyName: string; price: number }> = {
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

export function getSkuPrice(skuPartNumber: string): number {
  return SKU_PRICES[skuPartNumber]?.price ?? 0;
}
