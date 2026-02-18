"use client";

import { useActionState } from "react";
import {
  createRunbook,
  updateRunbook,
} from "@/app/dashboard/runbooks/actions";
import {
  FileText,
  Tag,
  LinkIcon,
  BookOpen,
  Loader2,
} from "lucide-react";

const CATEGORIES = [
  "Onboarding",
  "Offboarding",
  "Security",
  "Maintenance",
  "Troubleshooting",
  "Other",
];

type RunbookData = {
  id: number;
  title: string;
  category: string | null;
  content: string;
  taskId: number | null;
} | null;

export function RunbookForm({
  runbook,
  tasks,
}: {
  runbook?: RunbookData;
  tasks: { id: number; taskName: string }[];
}) {
  const isEdit = !!runbook;
  const action = isEdit ? updateRunbook : createRunbook;
  const [state, formAction, isPending] = useActionState(action, {
    error: "",
  });

  const inputClass =
    "w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors";

  return (
    <form action={formAction} className="space-y-5">
      {isEdit && <input type="hidden" name="id" value={runbook.id} />}

      {state.error !== "" && (
        <div className="bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-lg p-4">
          <p className="text-sm text-[var(--error)]">{state.error}</p>
        </div>
      )}

      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2"
        >
          <FileText className="w-4 h-4 text-[var(--text-muted)]" />
          Title <span className="text-[var(--error)]">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={runbook?.title ?? ""}
          placeholder="e.g. New Employee Onboarding Steps"
          className={inputClass}
        />
      </div>

      {/* Category */}
      <div>
        <label
          htmlFor="category"
          className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2"
        >
          <Tag className="w-4 h-4 text-[var(--text-muted)]" />
          Category <span className="text-[var(--error)]">*</span>
        </label>
        <select
          id="category"
          name="category"
          required
          defaultValue={runbook?.category ?? ""}
          className={inputClass}
        >
          <option value="">Select a category...</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Linked Task (optional) */}
      <div>
        <label
          htmlFor="taskId"
          className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2"
        >
          <LinkIcon className="w-4 h-4 text-[var(--text-muted)]" />
          Linked Task
        </label>
        <select
          id="taskId"
          name="taskId"
          defaultValue={runbook?.taskId?.toString() ?? ""}
          className={inputClass}
        >
          <option value="">None</option>
          {tasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.taskName}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div>
        <label
          htmlFor="content"
          className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2"
        >
          <BookOpen className="w-4 h-4 text-[var(--text-muted)]" />
          Content (Markdown)
        </label>
        <textarea
          id="content"
          name="content"
          rows={16}
          defaultValue={runbook?.content ?? ""}
          placeholder="Write your runbook content here using Markdown..."
          className={`${inputClass} font-mono resize-y`}
        />
        <p className="text-xs text-[var(--text-muted)] mt-1.5">
          Supports headings (#), **bold**, *italic*, `code`, code blocks, lists, and [links](url).
        </p>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {isPending
            ? isEdit
              ? "Saving..."
              : "Creating..."
            : isEdit
              ? "Save Changes"
              : "Create Runbook"}
        </button>
      </div>
    </form>
  );
}
