import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getSophosPartnerTenants } from "@/lib/sophos";
import { SophosLinkTable } from "@/components/sophos-link-table";
import { CrossLinkManager } from "@/components/cross-link-manager";
import { Settings, AlertTriangle } from "lucide-react";

export default async function SophosSettingsPage() {
  await requireRole("ADMIN");

  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      tenantName: true,
      tenantAbbrv: true,
      ninjaOrgId: true,
      sophosOrgId: true,
      sophosRegion: true,
      sophosApiHost: true,
    },
    orderBy: { tenantName: "asc" },
  });

  let sophosOrgs: Array<{ id: string; name: string; dataRegion: string; apiHost: string }> = [];
  let sophosError: string | null = null;

  try {
    const orgs = await getSophosPartnerTenants();
    sophosOrgs = orgs.map((o) => ({
      id: o.id,
      name: o.name,
      dataRegion: o.dataRegion,
      apiHost: o.apiHost,
    }));
  } catch (err) {
    sophosError =
      err instanceof Error
        ? err.message
        : "Failed to connect to Sophos Central API.";
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Sophos Settings
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Link Microsoft Tenants to Sophos Central Tenants
          </p>
        </div>
        <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
          <Settings className="w-5 h-5" style={{ color: "var(--accent)" }} />
        </div>
      </div>

      {/* Sophos API error banner */}
      {sophosError && (
        <div className="mb-6 flex items-start gap-3 p-4 bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-xl">
          <AlertTriangle
            className="w-5 h-5 mt-0.5 shrink-0"
            style={{ color: "var(--error)" }}
          />
          <div>
            <p className="text-sm font-medium text-[var(--error)]">
              Sophos Central Connection Failed
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {sophosError}. You can still see current links below, but cannot
              create new ones until the connection is restored.
            </p>
          </div>
        </div>
      )}

      {/* Link table */}
      <SophosLinkTable tenants={tenants} sophosOrgs={sophosOrgs} />

      {/* Cross-Link Manager */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Device Cross-Links
        </h3>
        <CrossLinkManager tenants={tenants} />
      </div>
    </div>
  );
}
