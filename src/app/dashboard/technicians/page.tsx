import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { SyncTechniciansButton } from "@/components/sync-technicians-button";
import {
  UserRound,
  Mail,
  Briefcase,
  CheckCircle2,
  XCircle,
  Calendar,
} from "lucide-react";

export default async function TechniciansPage() {
  await requireRole("ADMIN");
  const technicians = await prisma.technician.findMany({
    orderBy: { displayName: "asc" },
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Technicians
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {technicians.length} technician
            {technicians.length !== 1 ? "s" : ""} synced from Azure AD
          </p>
        </div>
        <SyncTechniciansButton />
      </div>

      {/* Content */}
      {technicians.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-[var(--bg-hover)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserRound className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            No technicians yet
          </h3>
          <p className="text-sm text-[var(--text-muted)] mb-6 max-w-md mx-auto">
            Click &ldquo;Sync from Azure AD&rdquo; to import technicians from
            the TUM APP group in Sentinel Edge tenant.
          </p>
          <SyncTechniciansButton />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {technicians.map((tech) => (
            <Link
              key={tech.id}
              href={`/dashboard/technicians/${tech.id}`}
              className="group bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--accent)] transition-all hover:shadow-lg hover:shadow-[var(--accent)]/5"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
                    <UserRound
                      className="w-5 h-5"
                      style={{ color: "var(--accent)" }}
                    />
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                    {tech.displayName}
                  </h3>
                </div>
                {tech.accountEnabled ? (
                  <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
                ) : (
                  <XCircle className="w-4 h-4 text-[var(--error)]" />
                )}
              </div>

              {/* Email */}
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span className="text-xs text-[var(--text-secondary)] truncate">
                  {tech.email}
                </span>
              </div>

              {/* Job Title */}
              {tech.jobTitle && (
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span className="text-xs text-[var(--text-secondary)]">
                    {tech.jobTitle}
                  </span>
                </div>
              )}

              {/* Last Sync */}
              <div className="pt-3 border-t border-[var(--border)] flex items-center gap-2">
                <Calendar className="w-3 h-3 text-[var(--text-muted)]" />
                <span className="text-xs text-[var(--text-muted)]">
                  Synced{" "}
                  {tech.lastSyncAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
