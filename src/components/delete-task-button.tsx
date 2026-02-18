"use client";

import { useState, useTransition } from "react";
import { deleteMasterTask } from "@/app/dashboard/tasks/actions";
import { Trash2, Loader2 } from "lucide-react";

export function DeleteTaskButton({ taskId }: { taskId: number }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--text-muted)]">Delete?</span>
        <button
          onClick={() =>
            startTransition(() => deleteMasterTask(taskId))
          }
          disabled={isPending}
          className="inline-flex items-center gap-1 px-3 py-2 bg-[var(--error)] hover:bg-[var(--error)]/80 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Yes"
          )}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] text-sm text-[var(--text-primary)] font-medium rounded-lg transition-colors hover:border-[var(--accent)]"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--error)] text-sm text-[var(--error)] font-medium rounded-lg transition-colors"
    >
      <Trash2 className="w-4 h-4" />
      Delete
    </button>
  );
}
