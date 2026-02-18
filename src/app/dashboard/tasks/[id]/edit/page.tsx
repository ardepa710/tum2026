import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import { MasterTaskForm } from "@/components/master-task-form";

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const taskId = Number(id);
  if (isNaN(taskId)) notFound();

  const task = await prisma.masterTask.findUnique({
    where: { id: taskId },
  });

  if (!task) notFound();

  return (
    <div>
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href={`/dashboard/tasks/${task.id}`}
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Task
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
          Edit Task
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Update the configuration for {task.taskName}
        </p>
      </div>

      {/* Form Card */}
      <div className="max-w-2xl bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
        <MasterTaskForm task={task} />
      </div>
    </div>
  );
}
