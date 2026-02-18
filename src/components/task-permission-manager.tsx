"use client";

import { useTransition, useState } from "react";
import {
  assignPermissionToTask,
  removePermissionFromTask,
} from "@/app/dashboard/permissions/actions";
import { X, Plus, Loader2, ShieldCheck } from "lucide-react";

type AssignedPermission = {
  permissionId: number;
  permission: {
    id: number;
    permissionCode: string;
    permissionEnabled: boolean;
  };
};

type AvailablePermission = {
  id: number;
  permissionCode: string;
};

export function TaskPermissionManager({
  taskId,
  assigned,
  available,
}: {
  taskId: number;
  assigned: AssignedPermission[];
  available: AvailablePermission[];
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState("");

  const unassigned = available.filter(
    (p) => !assigned.some((a) => a.permissionId === p.id)
  );

  function handleAssign() {
    if (!selectedId) return;
    startTransition(async () => {
      await assignPermissionToTask(taskId, Number(selectedId));
      setSelectedId("");
    });
  }

  function handleRemove(permissionId: number) {
    startTransition(() => removePermissionFromTask(taskId, permissionId));
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck
          className="w-5 h-5"
          style={{ color: "var(--accent)" }}
        />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Required Permissions
        </h3>
      </div>

      {/* Assigned permissions */}
      {assigned.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] mb-4">
          No permissions assigned. This task is accessible to all technicians.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2 mb-4">
          {assigned.map((a) => (
            <span
              key={a.permissionId}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-mono font-medium rounded-lg"
            >
              {a.permission.permissionCode}
              <button
                onClick={() => handleRemove(a.permissionId)}
                disabled={isPending}
                className="hover:text-[var(--error)] transition-colors disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add permission */}
      {unassigned.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="flex-1 px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          >
            <option value="">Select permission...</option>
            {unassigned.map((p) => (
              <option key={p.id} value={p.id}>
                {p.permissionCode}
              </option>
            ))}
          </select>
          <button
            onClick={handleAssign}
            disabled={!selectedId || isPending}
            className="inline-flex items-center gap-1 px-3 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
