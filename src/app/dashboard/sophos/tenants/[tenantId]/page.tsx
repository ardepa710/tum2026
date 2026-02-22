import { getSessionRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getSophosHealthCheck } from "@/lib/sophos";
import { SophosTenantCard } from "@/components/sophos-tenant-card";
import { SophosEndpointTable } from "@/components/sophos-endpoint-table";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { SophosHealthCheck as SophosHealthCheckType } from "@/lib/types/sophos";

export default async function SophosTenantDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const role = await getSessionRole();
  const { tenantId: tenantIdRaw } = await params;
  const tenantId = Number(tenantIdRaw);

  if (isNaN(tenantId)) notFound();

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      tenantName: true,
      tenantAbbrv: true,
      sophosOrgId: true,
      sophosRegion: true,
      sophosApiHost: true,
    },
  });

  if (!tenant || !tenant.sophosOrgId) notFound();

  let healthCheck: SophosHealthCheckType | null = null;
  try {
    healthCheck = await getSophosHealthCheck(tenantId);
  } catch {
    // Health check may not be available
  }

  const tenants = [{ id: tenant.id, tenantAbbrv: tenant.tenantAbbrv, sophosOrgId: tenant.sophosOrgId }];

  return (
    <div>
      {/* Back link */}
      <Link
        href="/dashboard/sophos/endpoints"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Endpoints
      </Link>

      {/* Header */}
      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
        {tenant.tenantName} — Sophos
      </h2>

      {/* Health check card */}
      <div className="mb-6">
        <SophosTenantCard
          tenantName={tenant.tenantName}
          tenantAbbrv={tenant.tenantAbbrv}
          sophosRegion={tenant.sophosRegion}
          healthCheck={healthCheck}
        />
      </div>

      {/* Endpoints for this tenant */}
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Endpoints</h3>
      <SophosEndpointTable tenants={tenants} initialTenantId={tenantId} role={role} />
    </div>
  );
}
