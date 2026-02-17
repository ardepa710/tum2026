import { prisma } from "@/lib/prisma";
import { TenantGroups } from "@/components/tenant-groups";

export default async function GroupsPage() {
  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      tenantName: true,
      tenantAbbrv: true,
    },
    orderBy: { tenantName: "asc" },
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Groups</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Browse Active Directory groups across your managed tenants
        </p>
      </div>
      <TenantGroups tenants={tenants} />
    </div>
  );
}
