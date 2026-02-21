import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getNinjaOrganizations } from "@/lib/ninja";
import { NinjaOrgCard } from "@/components/ninja-org-card";
import { Building2, AlertTriangle } from "lucide-react";
import type { NinjaOrganization } from "@/lib/types/ninja";

export default async function RmmTenantsPage() {
  await requireRole("VIEWER");

  // Fetch NinjaOne organizations
  let orgs: NinjaOrganization[] = [];
  let ninjaError: string | null = null;

  try {
    orgs = await getNinjaOrganizations();
  } catch (err) {
    ninjaError =
      err instanceof Error
        ? err.message
        : "Failed to connect to NinjaOne API.";
  }

  // Fetch tenants that have a ninjaOrgId to determine which orgs are linked
  const linkedTenants = await prisma.tenant.findMany({
    where: { ninjaOrgId: { not: null } },
    select: {
      ninjaOrgId: true,
      tenantName: true,
      tenantAbbrv: true,
    },
  });

  // Build a lookup map: ninjaOrgId -> tenant info
  const linkedMap = new Map(
    linkedTenants.map((t) => [
      t.ninjaOrgId!,
      { tenantName: t.tenantName, tenantAbbrv: t.tenantAbbrv },
    ]),
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            RMM &mdash; Organizations
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            NinjaOne managed organizations
          </p>
        </div>
        <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
          <Building2 className="w-5 h-5" style={{ color: "var(--accent)" }} />
        </div>
      </div>

      {/* API error banner */}
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
              {ninjaError}
            </p>
          </div>
        </div>
      )}

      {/* Organizations grid */}
      {orgs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orgs.map((org) => (
            <NinjaOrgCard
              key={org.id}
              org={org}
              linkedTenant={linkedMap.get(org.id) ?? null}
            />
          ))}
        </div>
      ) : (
        !ninjaError && (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
            <Building2
              className="w-10 h-10 mx-auto mb-3"
              style={{ color: "var(--text-muted)" }}
            />
            <p className="text-sm text-[var(--text-muted)]">
              No organizations found in NinjaOne.
            </p>
          </div>
        )
      )}
    </div>
  );
}
