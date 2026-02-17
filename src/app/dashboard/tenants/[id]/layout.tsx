import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ChevronRight } from "lucide-react";
import { TenantTabs } from "@/components/tenant-tabs";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenantId = Number(id);
  if (isNaN(tenantId)) notFound();

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, tenantName: true },
  });

  if (!tenant) notFound();

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm mb-6">
        <Link
          href="/dashboard"
          className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          Dashboard
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        <Link
          href="/dashboard/tenants"
          className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          Tenants
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        <span className="text-[var(--text-primary)] font-medium">
          {tenant.tenantName}
        </span>
      </nav>

      {/* Tab Navigation */}
      <TenantTabs tenantId={String(tenant.id)} />

      {/* Page Content */}
      {children}
    </div>
  );
}
