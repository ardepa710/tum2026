import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import { PermissionForm } from "@/components/permission-form";

export default async function EditPermissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const permId = Number(id);
  if (isNaN(permId)) notFound();

  const permission = await prisma.permission.findUnique({
    where: { id: permId },
  });

  if (!permission) notFound();

  return (
    <div>
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href={`/dashboard/permissions/${permission.id}`}
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Permission
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
          Edit Permission
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Update configuration for {permission.permissionCode}
        </p>
      </div>

      {/* Form Card */}
      <div className="max-w-2xl bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
        <PermissionForm permission={permission} />
      </div>
    </div>
  );
}
