import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { RunbookForm } from "@/components/runbook-form";

export default async function EditRunbookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("EDITOR");
  const { id } = await params;
  const runbookId = Number(id);
  if (isNaN(runbookId)) notFound();

  const [runbook, tasks] = await Promise.all([
    prisma.runbook.findUnique({
      where: { id: runbookId },
      select: {
        id: true,
        title: true,
        category: true,
        content: true,
        taskId: true,
      },
    }),
    prisma.masterTask.findMany({
      select: { id: true, taskName: true },
      orderBy: { taskName: "asc" },
    }),
  ]);

  if (!runbook) notFound();

  return (
    <div>
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href={`/dashboard/runbooks/${runbook.id}`}
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Runbook
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
          Edit Runbook
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Update the runbook content and metadata
        </p>
      </div>

      {/* Form Card */}
      <div className="max-w-2xl bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
        <RunbookForm runbook={runbook} tasks={tasks} />
      </div>
    </div>
  );
}
