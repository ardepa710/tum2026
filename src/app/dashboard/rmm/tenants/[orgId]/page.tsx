import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getNinjaOrgDetail, getNinjaOrgDevices } from "@/lib/ninja";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Monitor,
  Wifi,
  WifiOff,
  Layers,
  LinkIcon,
  AlertTriangle,
} from "lucide-react";
import type { NinjaOrganizationDetailed, NinjaDevice, NinjaNodeClass } from "@/lib/types/ninja";

// ---------------------------------------------------------------------------
// Helper: format NinjaOne timestamp to relative time
// ---------------------------------------------------------------------------

function formatNinjaTime(timestamp?: number): string {
  if (!timestamp) return "\u2014";
  // NinjaOne may use seconds or milliseconds — handle both
  const ms = timestamp < 2e10 ? timestamp * 1000 : timestamp;
  const diffMs = Date.now() - ms;
  if (diffMs < 0) return "just now";
  if (diffMs < 60_000) return "just now";
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)} min ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
  return `${Math.floor(diffMs / 86_400_000)}d ago`;
}

// ---------------------------------------------------------------------------
// Helper: badge color for node class
// ---------------------------------------------------------------------------

function nodeClassColor(nc?: NinjaNodeClass): string {
  if (!nc) return "bg-[var(--text-muted)]/10 text-[var(--text-muted)]";
  if (nc === "WINDOWS_WORKSTATION") return "bg-blue-500/10 text-blue-400";
  if (nc === "WINDOWS_SERVER") return "bg-purple-500/10 text-purple-400";
  if (nc === "MAC" || nc === "MAC_SERVER") return "bg-gray-500/10 text-gray-400";
  if (nc.startsWith("LINUX")) return "bg-green-500/10 text-green-400";
  if (nc.startsWith("NMS")) return "bg-orange-500/10 text-orange-400";
  return "bg-[var(--text-muted)]/10 text-[var(--text-muted)]";
}

function nodeClassLabel(nc?: NinjaNodeClass): string {
  if (!nc) return "Unknown";
  return nc
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function RmmTenantDetailPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  await requireRole("VIEWER");

  const { orgId: raw } = await params;
  const orgId = Number(raw);

  // Fetch org detail
  let org: NinjaOrganizationDetailed | null = null;
  let orgError: string | null = null;
  try {
    org = await getNinjaOrgDetail(orgId);
  } catch (err) {
    orgError =
      err instanceof Error ? err.message : "Failed to fetch organization detail.";
  }

  // Fetch org devices
  let devices: NinjaDevice[] = [];
  let devicesError: string | null = null;
  try {
    devices = await getNinjaOrgDevices(orgId);
  } catch (err) {
    devicesError =
      err instanceof Error ? err.message : "Failed to fetch organization devices.";
  }

  // Fetch linked tenant
  let linkedTenant: { tenantName: string; tenantAbbrv: string } | null = null;
  try {
    const tenant = await prisma.tenant.findFirst({
      where: { ninjaOrgId: orgId },
      select: { tenantName: true, tenantAbbrv: true },
    });
    linkedTenant = tenant;
  } catch {
    // Non-critical — silently ignore
  }

  // Compute stats
  const totalDevices = devices.length;
  const onlineCount = devices.filter((d) => d.offline === false).length;
  const offlineCount = devices.filter((d) => d.offline === true).length;
  const uniqueTypes = new Set(devices.map((d) => d.nodeClass).filter(Boolean));

  const orgName = org?.name ?? `Organization #${orgId}`;
  const anyError = orgError || devicesError;

  return (
    <div>
      {/* Back link */}
      <Link
        href="/dashboard/rmm/tenants"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Organizations
      </Link>

      {/* Error banner */}
      {anyError && (
        <div className="mb-6 flex items-start gap-3 p-4 bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-xl">
          <AlertTriangle
            className="w-5 h-5 mt-0.5 shrink-0"
            style={{ color: "var(--error)" }}
          />
          <div>
            <p className="text-sm font-medium text-[var(--error)]">
              NinjaOne API Error
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {orgError || devicesError}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              {orgName}
            </h2>
            {org?.description && (
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                {org.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              {org?.nodeApprovalMode && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                  Approval: {org.nodeApprovalMode}
                </span>
              )}
              {linkedTenant ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--success)]/10 text-[var(--success)]">
                  <LinkIcon className="w-2.5 h-2.5" />
                  Linked: {linkedTenant.tenantAbbrv}
                </span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--text-muted)]/10 text-[var(--text-muted)]">
                  Not linked
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Devices"
          value={totalDevices}
          icon={<Monitor className="w-4 h-4" />}
          color="var(--accent)"
        />
        <StatCard
          label="Online"
          value={onlineCount}
          icon={<Wifi className="w-4 h-4" />}
          color="var(--success)"
        />
        <StatCard
          label="Offline"
          value={offlineCount}
          icon={<WifiOff className="w-4 h-4" />}
          color="var(--error)"
        />
        <StatCard
          label="Device Types"
          value={uniqueTypes.size}
          icon={<Layers className="w-4 h-4" />}
          color="var(--warning)"
        />
      </div>

      {/* Devices table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Devices
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Last Contact
                </th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => {
                const name =
                  device.displayName || device.systemName || "Unknown";
                const isOnline = device.offline === false;

                return (
                  <tr
                    key={device.id}
                    className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/rmm/devices/${device.id}`}
                        className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
                      >
                        {name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${nodeClassColor(device.nodeClass)}`}
                      >
                        {nodeClassLabel(device.nodeClass)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span
                          className={`w-2 h-2 rounded-full ${isOnline ? "bg-[var(--success)]" : "bg-[var(--error)]"}`}
                        />
                        <span
                          className={
                            isOnline
                              ? "text-[var(--success)]"
                              : "text-[var(--error)]"
                          }
                        >
                          {isOnline ? "Online" : "Offline"}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      {formatNinjaTime(device.lastContact)}
                    </td>
                  </tr>
                );
              })}
              {devices.length === 0 && !devicesError && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-sm text-[var(--text-muted)]"
                  >
                    No devices found for this organization.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat card sub-component
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
        <span className="text-xs text-[var(--text-muted)]">{label}</span>
      </div>
      <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
