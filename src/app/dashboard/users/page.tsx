import { prisma } from "@/lib/prisma";
import { TenantUsers } from "@/components/tenant-users";

export default async function UsersPage() {
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
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Users</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Browse Active Directory users across your managed tenants
        </p>
      </div>
      <TenantUsers tenants={tenants} />
    </div>
  );
}
