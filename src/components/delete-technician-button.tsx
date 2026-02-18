"use client";

import { useState, useTransition } from "react";
import { deleteTechnician } from "@/app/dashboard/technicians/actions";
import { Trash2, Loader2 } from "lucide-react";

export function DeleteTechnicianButton({
  technicianId,
}: {
  technicianId: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  function handleDelete() {
    startTransition(() => deleteTechnician(technicianId));
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--text-muted)]">Are you sure?</span>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--error)] hover:bg-[var(--error)]/90 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          Delete
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--error)] text-sm text-[var(--text-primary)] font-medium rounded-lg transition-colors"
    >
      <Trash2 className="w-4 h-4" />
      Delete
    </button>
  );
}
