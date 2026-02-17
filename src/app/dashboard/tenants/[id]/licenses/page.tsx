import { getLicenses } from "@/lib/graph";
import {
  KeyRound,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
} from "lucide-react";

interface License {
  id: string;
  skuPartNumber: string;
  consumedUnits: number;
  prepaidUnits: {
    enabled: number;
    suspended: number;
    warning: number;
  };
}

export default async function TenantLicensesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let licenses: License[] = [];
  let error: string | null = null;

  try {
    licenses = await getLicenses(Number(id));
  } catch (e) {
    error =
      e instanceof Error
        ? e.message
        : "Failed to fetch licenses from Graph API.";
  }

  // Empty result means no config or no licenses
  if (!error && licenses.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <KeyRound className="w-6 h-6" style={{ color: "var(--accent)" }} />
          <h3 className="text-xl font-bold text-[var(--text-primary)]">
            Licenses
          </h3>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-14 h-14 bg-[var(--warning)]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7 text-[var(--warning)]" />
          </div>
          <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            No Licenses Available
          </h4>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
            Configure Azure credentials for this tenant to view subscribed
            licenses. Go to the Overview tab and ensure the Azure Tenant ID,
            Client ID, and Client Secret are set.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <KeyRound className="w-6 h-6" style={{ color: "var(--accent)" }} />
          <h3 className="text-xl font-bold text-[var(--text-primary)]">
            Licenses
          </h3>
        </div>
        <div className="bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-[var(--error)]" />
            <div>
              <p className="text-sm font-medium text-[var(--error)]">
                Failed to load licenses
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
          <KeyRound className="w-6 h-6" style={{ color: "var(--accent)" }} />
          <h3 className="text-xl font-bold text-[var(--text-primary)]">
            Licenses
          </h3>
        </div>
        <span className="text-sm text-[var(--text-muted)]">
          {licenses.length} subscription{licenses.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {licenses.map((license) => {
          const utilization =
            license.prepaidUnits.enabled > 0
              ? Math.round(
                  (license.consumedUnits / license.prepaidUnits.enabled) * 100
                )
              : 0;
          const utilizationColor =
            utilization >= 90
              ? "var(--error)"
              : utilization >= 70
                ? "var(--warning)"
                : "var(--success)";

          return (
            <div
              key={license.id}
              className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5"
            >
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                {license.skuPartNumber}
              </h4>

              {/* Usage Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[var(--text-muted)]">Usage</span>
                  <span
                    className="font-medium"
                    style={{ color: utilizationColor }}
                  >
                    {utilization}%
                  </span>
                </div>
                <div className="w-full h-2 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(utilization, 100)}%`,
                      backgroundColor: utilizationColor,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs mt-1.5">
                  <span className="text-[var(--text-muted)]">
                    {license.consumedUnits} consumed
                  </span>
                  <span className="text-[var(--text-muted)]">
                    {license.prepaidUnits.enabled} total
                  </span>
                </div>
              </div>

              {/* Prepaid Units Detail */}
              <div className="space-y-2 pt-3 border-t border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                    <CheckCircle2 className="w-3 h-3 text-[var(--success)]" />
                    Enabled
                  </span>
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    {license.prepaidUnits.enabled}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                    <PauseCircle className="w-3 h-3 text-[var(--warning)]" />
                    Suspended
                  </span>
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    {license.prepaidUnits.suspended}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                    <AlertCircle className="w-3 h-3 text-[var(--error)]" />
                    Warning
                  </span>
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    {license.prepaidUnits.warning}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
