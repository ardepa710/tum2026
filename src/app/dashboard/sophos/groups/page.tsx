import { prisma } from "@/lib/prisma";
import { getAccessibleTenantIds } from "@/lib/tenant-auth";
import { SophosGroupsList } from "@/components/sophos-groups-list";
import { FolderTree } from "lucide-react";

export default async function SophosGroupsPage() {
  const accessibleIds = await getAccessibleTenantIds();

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
            Sophos Endpoint Groups
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manage endpoint groups across tenants
          </p>
        </div>
        <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
          <FolderTree className="w-5 h-5" style={{ color: "var(--accent)" }} />
        </div>
      </div>
      <SophosGroupsList tenants={tenants} />
    </div>
  );
}
