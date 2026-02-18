import { prisma } from "@/lib/prisma";
import { CreditCard } from "lucide-react";
import { LicenseDashboard } from "@/components/license-dashboard";

export default async function LicensesPage() {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, tenantAbbrv: true },
    orderBy: { tenantAbbrv: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            License Utilization
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Cross-tenant license overview
          </p>
        </div>
        <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
          <CreditCard className="w-5 h-5" style={{ color: "var(--accent)" }} />
        </div>
      </div>
      <LicenseDashboard tenants={tenants} />
    </div>
  );
}
