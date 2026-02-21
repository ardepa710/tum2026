import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getNinjaOrganizations } from "@/lib/ninja";
import { NinjaLinkTable } from "@/components/ninja-link-table";
import { Settings, AlertTriangle } from "lucide-react";

export default async function RmmSettingsPage() {
  await requireRole("ADMIN");

  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      tenantName: true,
      tenantAbbrv: true,
      ninjaOrgId: true,
      ninjaOrgName: true,
    },
    orderBy: { tenantName: "asc" },
  });

  let ninjaOrgs: Array<{ id: number; name: string }> = [];
  let ninjaError: string | null = null;

  try {
    const orgs = await getNinjaOrganizations();
    ninjaOrgs = orgs.map((o) => ({ id: o.id, name: o.name }));
  } catch (err) {
    ninjaError =
      err instanceof Error
        ? err.message
        : "Failed to connect to NinjaOne API.";
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            RMM Settings
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Link Microsoft Tenants to NinjaOne Organizations
          </p>
        </div>
        <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
          <Settings className="w-5 h-5" style={{ color: "var(--accent)" }} />
        </div>
      </div>

      {/* Ninja API error banner */}
      {ninjaError && (
        <div className="mb-6 flex items-start gap-3 p-4 bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-xl">
          <AlertTriangle
            className="w-5 h-5 mt-0.5 shrink-0"
            style={{ color: "var(--error)" }}
          />
          <div>
            <p className="text-sm font-medium text-[var(--error)]">
              NinjaOne Connection Failed
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {ninjaError}. You can still see current links below, but cannot
              create new ones until the connection is restored.
            </p>
          </div>
        </div>
      )}

      {/* Link table */}
      <NinjaLinkTable tenants={tenants} ninjaOrgs={ninjaOrgs} />
    </div>
  );
}
