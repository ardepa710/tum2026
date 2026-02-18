"use client";

import { useActionState, useTransition } from "react";
import {
  createTechPermission,
  removeTechPermission,
} from "@/app/dashboard/permissions/actions";
import { X, Plus, Loader2, UserRound, Mail } from "lucide-react";

type TechEntry = {
  id: number;
  techName: string;
  techEmail: string;
};

export function TechPermissionManager({
  permissionId,
  technicians,
}: {
  permissionId: number;
  technicians: TechEntry[];
}) {
  const [state, formAction, isCreating] = useActionState(
    createTechPermission,
    { error: "" }
  );
  const [isRemoving, startRemoveTransition] = useTransition();

  function handleRemove(id: number) {
    startRemoveTransition(() => removeTechPermission(id, permissionId));
  }

  return (
    <div>
      {/* Existing technicians */}
      {technicians.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] mb-4">
          No technicians assigned yet.
        </p>
      ) : (
        <div className="space-y-2 mb-4">
          {technicians.map((tech) => (
            <div
              key={tech.id}
              className="flex items-center justify-between px-3 py-2 bg-[var(--bg-primary)] rounded-lg"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
                  <UserRound className="w-3.5 h-3.5 text-[var(--accent)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-[var(--text-primary)] truncate">
                    {tech.techName}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {tech.techEmail}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleRemove(tech.id)}
                disabled={isRemoving}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--error)] transition-colors disabled:opacity-50 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="permissionId" value={permissionId} />

        {state.error !== "" && (
          <p className="text-xs text-[var(--error)]">{state.error}</p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              name="techName"
              type="text"
              required
              placeholder="Name"
              className="w-full pl-9 pr-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              name="techEmail"
              type="email"
              required
              placeholder="Email"
              className="w-full pl-9 pr-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isCreating}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isCreating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          Add Technician
        </button>
      </form>
    </div>
  );
}
