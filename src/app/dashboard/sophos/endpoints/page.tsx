import { getSessionRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getAccessibleTenantIds } from "@/lib/tenant-auth";
import { SophosEndpointTable } from "@/components/sophos-endpoint-table";
import { Shield } from "lucide-react";

export default async function SophosEndpointsPage() {
  const [role, accessibleIds] = await Promise.all([
    getSessionRole(),
    getAccessibleTenantIds(),
  ]);

  const tenants = await prisma.tenant.findMany({
    where: { sophosOrgId: { not: null }, id: { in: accessibleIds } },
    select: { id: true, tenantAbbrv: true, sophosOrgId: true },
    orderBy: { tenantName: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Sophos Endpoints
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Endpoint security monitoring across all tenants
          </p>
        </div>
        <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
          <Shield className="w-5 h-5" style={{ color: "var(--accent)" }} />
        </div>
      </div>

      <SophosEndpointTable tenants={tenants} role={role} />
    </div>
  );
}
