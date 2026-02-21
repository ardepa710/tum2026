"use client";

import { useState, useEffect } from "react";
import { CreditCard, ChevronDown, ChevronUp, Loader2, TrendingDown } from "lucide-react";
import type { OptimizationSummary } from "@/lib/types/license-optimization";

type TenantLicense = {
  skuId: string;
  skuPartNumber: string;
  prepaidUnits: {
    enabled: number;
    suspended: number;
    warning: number;
  };
  consumedUnits: number;
  appliesTo: string;
};

type TenantInfo = {
  id: number;
  tenantAbbrv: string;
};

type AggregatedSku = {
  skuPartNumber: string;
  totalEnabled: number;
  totalConsumed: number;
  perTenant: {
    tenantAbbrv: string;
    enabled: number;
    consumed: number;
  }[];
};

function formatSkuName(skuPartNumber: string): string {
  return skuPartNumber
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function LicenseDashboard({ tenants }: { tenants: TenantInfo[] }) {
  const [aggregated, setAggregated] = useState<AggregatedSku[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSkus, setExpandedSkus] = useState<Set<string>>(new Set());
  const [optimization, setOptimization] = useState<OptimizationSummary | null>(null);
  const [optimizationLoading, setOptimizationLoading] = useState(true);
  const [showOptimization, setShowOptimization] = useState(false);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const results = await Promise.all(
          tenants.map(async (tenant) => {
            try {
              const res = await fetch(`/api/tenants/${tenant.id}/licenses`);
              if (!res.ok) return { tenant, licenses: [] as TenantLicense[] };
              const licenses: TenantLicense[] = await res.json();
              return { tenant, licenses };
            } catch {
              return { tenant, licenses: [] as TenantLicense[] };
            }
          })
        );

        // Aggregate by skuPartNumber
        const skuMap = new Map<string, AggregatedSku>();

        for (const { tenant, licenses } of results) {
          for (const license of licenses) {
            const existing = skuMap.get(license.skuPartNumber);
            if (existing) {
              existing.totalEnabled += license.prepaidUnits.enabled;
              existing.totalConsumed += license.consumedUnits;
              existing.perTenant.push({
                tenantAbbrv: tenant.tenantAbbrv,
                enabled: license.prepaidUnits.enabled,
                consumed: license.consumedUnits,
              });
            } else {
              skuMap.set(license.skuPartNumber, {
                skuPartNumber: license.skuPartNumber,
                totalEnabled: license.prepaidUnits.enabled,
                totalConsumed: license.consumedUnits,
                perTenant: [
                  {
                    tenantAbbrv: tenant.tenantAbbrv,
                    enabled: license.prepaidUnits.enabled,
                    consumed: license.consumedUnits,
                  },
                ],
              });
            }
          }
        }

        setAggregated(
          Array.from(skuMap.values()).sort((a, b) =>
            a.skuPartNumber.localeCompare(b.skuPartNumber)
          )
        );
      } finally {
        setLoading(false);
      }
    }

    async function fetchOptimization() {
      setOptimizationLoading(true);
      try {
        const res = await fetch("/api/licenses/optimization");
        if (res.ok) {
          const data: OptimizationSummary = await res.json();
          setOptimization(data);
        }
      } catch {
        // silently fail — optimization is supplementary
      } finally {
        setOptimizationLoading(false);
      }
    }

    if (tenants.length > 0) {
      fetchAll();
      fetchOptimization();
    } else {
      setLoading(false);
      setOptimizationLoading(false);
    }
  }, [tenants]);

  function toggleExpand(skuPartNumber: string) {
    setExpandedSkus((prev) => {
      const next = new Set(prev);
      if (next.has(skuPartNumber)) {
        next.delete(skuPartNumber);
      } else {
        next.add(skuPartNumber);
      }
      return next;
    });
  }

  if (loading) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
        <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin mx-auto mb-4" />
        <p className="text-sm text-[var(--text-secondary)]">
          Loading licenses across all tenants...
        </p>
      </div>
    );
  }

  if (aggregated.length === 0) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
        <div className="w-14 h-14 bg-[var(--warning)]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-7 h-7 text-[var(--warning)]" />
        </div>
        <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          No Licenses Found
        </h4>
        <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
          No license data was returned from any tenant. Ensure Azure credentials
          are configured for at least one tenant.
        </p>
      </div>
    );
  }

  const wasteColor =
    optimization && optimization.totalEstimatedWaste >= 200
      ? "var(--error)"
      : optimization && optimization.totalEstimatedWaste >= 50
        ? "var(--warning)"
        : "var(--success)";

  return (
    <>
      {/* License Optimization Section */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl mb-6">
        {/* Collapsible header */}
        <button
          onClick={() => setShowOptimization((prev) => !prev)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--bg-hover)] transition-colors rounded-xl"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[var(--warning)]/10 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-[var(--warning)]" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                License Optimization
              </h3>
              {optimization && !optimizationLoading && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {optimization.recommendations.length} recommendation{optimization.recommendations.length !== 1 ? "s" : ""} across {optimization.analyzedTenants} tenant{optimization.analyzedTenants !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {optimizationLoading && (
              <Loader2 className="w-4 h-4 text-[var(--text-muted)] animate-spin" />
            )}
            {optimization && !optimizationLoading && (
              <span
                className="text-sm font-bold"
                style={{ color: wasteColor }}
              >
                ~${optimization.totalEstimatedWaste.toFixed(0)}/mo waste
              </span>
            )}
            {showOptimization ? (
              <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
            )}
          </div>
        </button>

        {/* Expanded content */}
        {showOptimization && (
          <div className="px-5 pb-5">
            {optimizationLoading ? (
              <div className="py-6 text-center">
                <Loader2 className="w-6 h-6 text-[var(--accent)] animate-spin mx-auto mb-2" />
                <p className="text-xs text-[var(--text-muted)]">Analyzing license utilization...</p>
              </div>
            ) : !optimization || optimization.recommendations.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-[var(--success)] font-medium">All licenses are well-utilized!</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  No optimization recommendations at this time.
                </p>
              </div>
            ) : (
              <>
                {/* Summary card */}
                <div
                  className="rounded-lg px-4 py-3 mb-4 border"
                  style={{
                    borderColor: wasteColor,
                    backgroundColor: `color-mix(in srgb, ${wasteColor} 5%, transparent)`,
                  }}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Estimated Monthly Waste</p>
                      <p className="text-xl font-bold" style={{ color: wasteColor }}>
                        ${optimization.totalEstimatedWaste.toFixed(0)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[var(--text-muted)]">Analyzed</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {optimization.analyzedSkus} SKUs / {optimization.analyzedTenants} tenants
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recommendations table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider pb-2 pr-3">
                          Tenant
                        </th>
                        <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider pb-2 pr-3">
                          License
                        </th>
                        <th className="text-center text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider pb-2 pr-3">
                          Utilization
                        </th>
                        <th className="text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider pb-2 pr-3">
                          Unused
                        </th>
                        <th className="text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider pb-2 pr-3">
                          Waste/mo
                        </th>
                        <th className="text-center text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider pb-2">
                          Severity
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {optimization.recommendations.map((rec, i) => {
                        const barColor =
                          rec.severity === "wasteful"
                            ? "var(--error)"
                            : "var(--warning)";
                        return (
                          <tr key={`${rec.tenantId}-${rec.skuPartNumber}-${i}`}>
                            {/* Tenant badge */}
                            <td className="py-2.5 pr-3">
                              <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-md bg-[var(--accent)]/10 text-[var(--accent)]">
                                {rec.tenantAbbrv}
                              </span>
                            </td>
                            {/* SKU name + recommendation */}
                            <td className="py-2.5 pr-3">
                              <p className="text-xs font-medium text-[var(--text-primary)]">
                                {rec.friendlyName}
                              </p>
                              <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                                {rec.recommendation}
                              </p>
                            </td>
                            {/* Utilization bar */}
                            <td className="py-2.5 pr-3 min-w-[100px]">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-hover)]">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                      width: `${Math.min(rec.utilizationPct, 100)}%`,
                                      backgroundColor: barColor,
                                    }}
                                  />
                                </div>
                                <span
                                  className="text-xs font-medium tabular-nums"
                                  style={{ color: barColor, minWidth: "32px", textAlign: "right" }}
                                >
                                  {rec.utilizationPct}%
                                </span>
                              </div>
                            </td>
                            {/* Unused count */}
                            <td className="py-2.5 pr-3 text-right">
                              <span className="text-xs font-medium text-[var(--text-primary)] tabular-nums">
                                {rec.unusedCount}
                              </span>
                              <span className="text-[10px] text-[var(--text-muted)]">
                                /{rec.totalEnabled}
                              </span>
                            </td>
                            {/* Waste amount */}
                            <td className="py-2.5 pr-3 text-right">
                              <span
                                className="text-xs font-bold tabular-nums"
                                style={{ color: barColor }}
                              >
                                ${rec.estimatedWastePerMonth.toFixed(0)}
                              </span>
                            </td>
                            {/* Severity badge */}
                            <td className="py-2.5 text-center">
                              <span
                                className="inline-block px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full"
                                style={{
                                  color:
                                    rec.severity === "wasteful"
                                      ? "var(--error)"
                                      : rec.severity === "review"
                                        ? "var(--warning)"
                                        : "var(--success)",
                                  backgroundColor:
                                    rec.severity === "wasteful"
                                      ? "color-mix(in srgb, var(--error) 12%, transparent)"
                                      : rec.severity === "review"
                                        ? "color-mix(in srgb, var(--warning) 12%, transparent)"
                                        : "color-mix(in srgb, var(--success) 12%, transparent)",
                                }}
                              >
                                {rec.severity}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Existing license grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {aggregated.map((sku) => {
          const available = sku.totalEnabled - sku.totalConsumed;
          const utilization =
            sku.totalEnabled > 0
              ? Math.round((sku.totalConsumed / sku.totalEnabled) * 100)
              : 0;
          const utilizationColor =
            utilization >= 90
              ? "var(--error)"
              : utilization >= 70
                ? "var(--warning)"
                : "var(--success)";
          const barColorClass =
            utilization >= 90
              ? "bg-[var(--error)]"
              : utilization >= 70
                ? "bg-[var(--warning)]"
                : "bg-[var(--success)]";
          const isExpanded = expandedSkus.has(sku.skuPartNumber);

          return (
            <div
              key={sku.skuPartNumber}
              className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                  {formatSkuName(sku.skuPartNumber)}
                </h4>
                <button
                  onClick={() => toggleExpand(sku.skuPartNumber)}
                  className="p-1 rounded hover:bg-[var(--bg-hover)] transition-colors"
                  title={isExpanded ? "Collapse" : "Expand per-tenant breakdown"}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                  )}
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Total</p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">
                    {sku.totalEnabled}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Consumed</p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">
                    {sku.totalConsumed}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Available</p>
                  <p
                    className="text-lg font-bold"
                    style={{ color: available <= 0 ? "var(--error)" : "var(--success)" }}
                  >
                    {available}
                  </p>
                </div>
              </div>

              {/* Utilization Bar */}
              <div className="mb-1">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[var(--text-muted)]">Utilization</span>
                  <span className="font-medium" style={{ color: utilizationColor }}>
                    {utilization}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--bg-hover)]">
                  <div
                    className={`h-full rounded-full transition-all ${barColorClass}`}
                    style={{ width: `${Math.min(utilization, 100)}%` }}
                  />
                </div>
              </div>

              {/* Per-tenant breakdown (expandable) */}
              {isExpanded && sku.perTenant.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[var(--border)]">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider pb-2">
                          Tenant
                        </th>
                        <th className="text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider pb-2">
                          Enabled
                        </th>
                        <th className="text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider pb-2">
                          Consumed
                        </th>
                        <th className="text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider pb-2">
                          Available
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {sku.perTenant.map((entry) => (
                        <tr key={entry.tenantAbbrv}>
                          <td className="py-1.5 text-xs font-medium text-[var(--text-primary)]">
                            {entry.tenantAbbrv}
                          </td>
                          <td className="py-1.5 text-xs text-[var(--text-secondary)] text-right">
                            {entry.enabled}
                          </td>
                          <td className="py-1.5 text-xs text-[var(--text-secondary)] text-right">
                            {entry.consumed}
                          </td>
                          <td className="py-1.5 text-xs text-right font-medium" style={{
                            color: entry.enabled - entry.consumed <= 0 ? "var(--error)" : "var(--success)",
                          }}>
                            {entry.enabled - entry.consumed}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
