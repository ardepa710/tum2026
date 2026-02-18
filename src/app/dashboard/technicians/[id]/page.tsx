import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DeleteTechnicianButton } from "@/components/delete-technician-button";
import {
  UserRound,
  Mail,
  Briefcase,
  CheckCircle2,
  XCircle,
  Calendar,
  ArrowLeft,
  ShieldCheck,
  Key,
} from "lucide-react";

export default async function TechnicianDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const techId = Number(id);
  if (isNaN(techId)) notFound();

  const technician = await prisma.technician.findUnique({
    where: { id: techId },
  });

  if (!technician) notFound();

  // Get permissions linked by email
  const permissions = await prisma.techPermission.findMany({
    where: { techEmail: technician.email },
    include: {
      permission: {
        select: {
          id: true,
          permissionCode: true,
          permissionDescription: true,
        },
      },
    },
    orderBy: { permission: { permissionCode: "asc" } },
  });

  return (
    <div>
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href="/dashboard/technicians"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Technicians
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[var(--accent)]/10 rounded-xl flex items-center justify-center">
            <UserRound
              className="w-7 h-7"
              style={{ color: "var(--accent)" }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                {technician.displayName}
              </h2>
              {technician.accountEnabled ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--success)]/10 text-[var(--success)] text-xs rounded-md">
                  <CheckCircle2 className="w-3 h-3" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--error)]/10 text-[var(--error)] text-xs rounded-md">
                  <XCircle className="w-3 h-3" />
                  Disabled
                </span>
              )}
            </div>
            {technician.jobTitle && (
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                {technician.jobTitle}
              </p>
            )}
          </div>
        </div>
        <DeleteTechnicianButton technicianId={technician.id} />
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Contact */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
            Contact
          </h3>
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span className="text-xs text-[var(--text-secondary)] break-all">
              {technician.email}
            </span>
          </div>
        </div>

        {/* Azure AD */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
            Azure AD
          </h3>
          <div>
            <span className="text-xs text-[var(--text-muted)]">User ID</span>
            <p className="text-xs text-[var(--text-secondary)] font-mono truncate">
              {technician.msftId}
            </p>
          </div>
        </div>

        {/* Sync */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
            Sync Status
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-secondary)]">
                Last sync:{" "}
                {technician.lastSyncAt.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-secondary)]">
                Created:{" "}
                {technician.createdAt.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Permissions */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck
            className="w-5 h-5"
            style={{ color: "var(--accent)" }}
          />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Permissions
          </h3>
          <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-hover)] px-1.5 py-0.5 rounded-full">
            {permissions.length}
          </span>
        </div>

        {permissions.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            No permissions assigned. Visit{" "}
            <Link
              href="/dashboard/permissions"
              className="text-[var(--accent)] hover:underline"
            >
              Permissions
            </Link>{" "}
            to assign permissions to this technician.
          </p>
        ) : (
          <div className="space-y-2">
            {permissions.map((tp) => (
              <Link
                key={tp.id}
                href={`/dashboard/permissions/${tp.permission.id}`}
                className="flex items-center justify-between px-3 py-2 bg-[var(--bg-primary)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span className="text-sm text-[var(--text-primary)] font-mono">
                    {tp.permission.permissionCode}
                  </span>
                </div>
                {tp.permission.permissionDescription && (
                  <span className="text-xs text-[var(--text-muted)] max-w-[200px] truncate">
                    {tp.permission.permissionDescription}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
