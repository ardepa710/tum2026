"use client";

import { useTransition, useState } from "react";
import {
  assignPermissionToUser,
  removePermissionFromUser,
} from "@/app/dashboard/permissions/actions";
import { X, Plus, Loader2, ShieldCheck } from "lucide-react";

type AssignedPermission = {
  permissionId: number;
  permission: {
    id: number;
    permissionCode: string;
  };
  assignedAt: Date;
};

type AvailablePermission = {
  id: number;
  permissionCode: string;
};

export function UserPermissionManager({
  userId,
  assigned,
  available,
}: {
  userId: string;
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
      await assignPermissionToUser(userId, Number(selectedId));
      setSelectedId("");
    });
  }

  function handleRemove(permissionId: number) {
    startTransition(() => removePermissionFromUser(userId, permissionId));
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4" style={{ color: "var(--accent)" }} />
        <span className="text-xs font-semibold text-[var(--text-primary)]">
          Permissions
        </span>
      </div>

      {/* Assigned */}
      {assigned.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)] mb-3">
          No permissions assigned.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {assigned.map((a) => (
            <span
              key={a.permissionId}
              className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-mono rounded-md"
            >
              {a.permission.permissionCode}
              <button
                onClick={() => handleRemove(a.permissionId)}
                disabled={isPending}
                className="hover:text-[var(--error)] transition-colors disabled:opacity-50"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add */}
      {unassigned.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="flex-1 px-2 py-1.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          >
            <option value="">Add permission...</option>
            {unassigned.map((p) => (
              <option key={p.id} value={p.id}>
                {p.permissionCode}
              </option>
            ))}
          </select>
          <button
            onClick={handleAssign}
            disabled={!selectedId || isPending}
            className="inline-flex items-center gap-1 px-2 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
          >
            {isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Plus className="w-3 h-3" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
