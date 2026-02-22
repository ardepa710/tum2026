import { getSessionRole } from "@/lib/rbac";
import { getSophosEndpoint } from "@/lib/sophos";
import { SophosEndpointDetail } from "@/components/sophos-endpoint-detail";
import { SophosEndpointActions } from "@/components/sophos-endpoint-actions";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function SophosEndpointDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ endpointId: string }>;
  searchParams: Promise<{ tenantId?: string }>;
}) {
  const role = await getSessionRole();
  const { endpointId } = await params;
  const { tenantId: tenantIdRaw } = await searchParams;

  if (!tenantIdRaw) notFound();
  const tenantId = Number(tenantIdRaw);
  if (isNaN(tenantId)) notFound();

  let endpoint;
  try {
    endpoint = await getSophosEndpoint(tenantId, endpointId);
  } catch {
    notFound();
  }

  return (
    <div>
      <Link
        href="/dashboard/sophos/endpoints"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Endpoints
      </Link>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            {endpoint.hostname}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {endpoint.os?.name} &mdash;{" "}
            {endpoint.type === "server" ? "Server" : "Workstation"}
          </p>
        </div>
        <SophosEndpointActions
          tenantId={tenantId}
          endpointId={endpointId}
          tamperEnabled={endpoint.tamperProtectionEnabled}
          role={role}
        />
      </div>
      <SophosEndpointDetail
        endpoint={endpoint}
        tenantId={tenantId}
        role={role}
      />
    </div>
  );
}
