import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  User,
  Cog,
  Building2,
  Timer,
  Ticket,
  FileText,
  AlertTriangle,
  UserCheck,
} from "lucide-react";

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

export default async function TaskRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const runId = Number(id);
  if (isNaN(runId)) notFound();

  const run = await prisma.taskRun.findUnique({
    where: { id: runId },
    include: {
      task: { select: { taskName: true } },
      tenant: { select: { tenantAbbrv: true } },
    },
  });

  if (!run) notFound();

  const statusBadge =
    run.status === "SUCCESS"
      ? "bg-[var(--success)]/15 text-[var(--success)]"
      : run.status === "FAILED"
        ? "bg-[var(--error)]/15 text-[var(--error)]"
        : "bg-[var(--accent)]/15 text-[var(--accent)] animate-pulse";

  return (
    <div>
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href="/dashboard/runs"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Execution History
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[var(--accent)]/10 rounded-xl flex items-center justify-center">
            <Cog className="w-7 h-7" style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                {run.task.taskName}
              </h2>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-md ${statusBadge}`}
              >
                {run.status}
              </span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Run #{run.id}
            </p>
          </div>
        </div>
      </div>

      {/* Detail Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Actor */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-xs text-[var(--text-muted)]">Actor</span>
          </div>
          <p className="text-sm text-[var(--text-primary)]">{run.actor}</p>
        </div>

        {/* Tenant */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-xs text-[var(--text-muted)]">Tenant</span>
          </div>
          <p className="text-sm text-[var(--text-primary)] font-mono">
            {run.tenant.tenantAbbrv}
          </p>
        </div>

        {/* Target User */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-xs text-[var(--text-muted)]">
              Target User
            </span>
          </div>
          <p className="text-sm text-[var(--text-primary)]">
            {run.targetUser ?? "\u2014"}
          </p>
        </div>

        {/* Ticket # */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Ticket className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-xs text-[var(--text-muted)]">
              Ticket Number
            </span>
          </div>
          <p className="text-sm text-[var(--text-primary)] font-mono">
            {run.ticketNumber ?? "\u2014"}
          </p>
        </div>

        {/* Started At */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-xs text-[var(--text-muted)]">
              Started At
            </span>
          </div>
          <p className="text-sm text-[var(--text-primary)]">
            {run.startedAt.toLocaleString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>
        </div>

        {/* Completed At */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-xs text-[var(--text-muted)]">
              Completed At
            </span>
          </div>
          <p className="text-sm text-[var(--text-primary)]">
            {run.completedAt
              ? run.completedAt.toLocaleString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })
              : "\u2014"}
          </p>
        </div>

        {/* Duration */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 md:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <Timer className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-xs text-[var(--text-muted)]">Duration</span>
          </div>
          <p className="text-sm text-[var(--text-primary)]">
            {run.durationMs != null ? formatDuration(run.durationMs) : "\u2014"}
          </p>
        </div>
      </div>

      {/* Output Section */}
      {run.output && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5" style={{ color: "var(--accent)" }} />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Output
            </h3>
          </div>
          <pre className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-4 overflow-x-auto text-xs font-mono text-[var(--text-secondary)] whitespace-pre-wrap">
            {run.output}
          </pre>
        </div>
      )}

      {/* Error Section */}
      {run.errorMessage && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle
              className="w-5 h-5"
              style={{ color: "var(--error)" }}
            />
            <h3 className="text-sm font-semibold text-[var(--error)]">
              Error Message
            </h3>
          </div>
          <pre className="bg-[var(--bg-primary)] border border-[var(--error)]/30 rounded-lg p-4 overflow-x-auto text-xs font-mono text-[var(--text-secondary)] whitespace-pre-wrap">
            {run.errorMessage}
          </pre>
        </div>
      )}
    </div>
  );
}
