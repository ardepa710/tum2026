import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MasterTaskForm } from "@/components/master-task-form";

export default function NewTaskPage() {
  return (
    <div>
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href="/dashboard/tasks"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tasks
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
          Add New Task
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Define a new automation task configuration
        </p>
      </div>

      {/* Form Card */}
      <div className="max-w-2xl bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
        <MasterTaskForm />
      </div>
    </div>
  );
}
