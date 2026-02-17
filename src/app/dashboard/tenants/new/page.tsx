import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TenantForm } from "@/components/tenant-form";

export default function NewTenantPage() {
  return (
    <div>
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href="/dashboard/tenants"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tenants
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
          Add New Tenant
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Configure a new Microsoft 365 tenant for management
        </p>
      </div>

      {/* Form Card */}
      <div className="max-w-2xl bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
        <TenantForm />
      </div>
    </div>
  );
}
