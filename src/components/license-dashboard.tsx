"use client";

import { useState, useEffect } from "react";
import { CreditCard, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

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

    if (tenants.length > 0) {
      fetchAll();
    } else {
      setLoading(false);
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

  return (
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
  );
}
