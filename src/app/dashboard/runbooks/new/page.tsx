import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { RunbookForm } from "@/components/runbook-form";

export default async function NewRunbookPage() {
  await requireRole("EDITOR");

  const tasks = await prisma.masterTask.findMany({
    select: { id: true, taskName: true },
    orderBy: { taskName: "asc" },
  });

  return (
    <div>
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href="/dashboard/runbooks"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Runbooks
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
          New Runbook
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Create a new runbook with step-by-step instructions
        </p>
      </div>

      {/* Form Card */}
      <div className="max-w-2xl bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
        <RunbookForm tasks={tasks} />
      </div>
    </div>
  );
}
