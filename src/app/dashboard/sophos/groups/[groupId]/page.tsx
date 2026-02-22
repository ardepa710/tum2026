import { getSessionRole } from "@/lib/rbac";
import { SophosGroupDetail } from "@/components/sophos-group-detail";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function SophosGroupDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ tenantId?: string }>;
}) {
  const role = await getSessionRole();
  const { groupId } = await params;
  const { tenantId: tenantIdRaw } = await searchParams;

  if (!tenantIdRaw) notFound();
  const tenantId = Number(tenantIdRaw);
  if (isNaN(tenantId)) notFound();

  return (
    <div>
      <Link
        href="/dashboard/sophos/groups"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Groups
      </Link>
      <SophosGroupDetail groupId={groupId} tenantId={tenantId} role={role} />
    </div>
  );
}
