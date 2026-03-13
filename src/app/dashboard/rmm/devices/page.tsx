import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getAccessibleTenantIds } from "@/lib/tenant-auth";
import { Monitor } from "lucide-react";
import { NinjaDeviceTable } from "@/components/ninja-device-table";

export default async function RmmDevicesPage() {
  await requireRole("VIEWER");

  const accessibleIds = await getAccessibleTenantIds();
  const accessibleTenants = await prisma.tenant.findMany({
    where: { id: { in: accessibleIds }, ninjaOrgId: { not: null } },
    select: { ninjaOrgId: true },
  });
  const allowedOrgIds = accessibleTenants.map((t) => t.ninjaOrgId!);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Devices
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            NinjaOne managed devices across your organizations
          </p>
        </div>
        <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
          <Monitor className="w-5 h-5" style={{ color: "var(--accent)" }} />
        </div>
      </div>

      {/* Device table (client component) */}
      <NinjaDeviceTable allowedOrgIds={allowedOrgIds} />
    </div>
  );
}
