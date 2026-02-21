import { prisma } from "@/lib/prisma";
import { SecurityDashboard } from "@/components/security-dashboard";
import { requireRole } from "@/lib/rbac";
import { Shield } from "lucide-react";

export default async function SecurityPage() {
  const role = await requireRole("VIEWER");
  const tenants = await prisma.tenant.findMany({
    select: { id: true, tenantAbbrv: true },
    orderBy: { tenantAbbrv: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Security Posture
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Compliance checks and security scoring across tenants
          </p>
        </div>
        <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
          <Shield className="w-5 h-5" style={{ color: "var(--accent)" }} />
        </div>
      </div>
      <SecurityDashboard tenants={tenants} role={role} />
    </div>
  );
}
