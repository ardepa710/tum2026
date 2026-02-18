"use client";

import { useActionState } from "react";
import {
  createPermission,
  updatePermission,
} from "@/app/dashboard/permissions/actions";
import { Loader2, ShieldCheck, Code, FileText } from "lucide-react";

type PermissionData = {
  id: number;
  permissionCode: string;
  permissionDescription: string | null;
  permissionEnabled: boolean;
} | null;

export function PermissionForm({
  permission,
}: {
  permission?: PermissionData;
}) {
  const isEdit = !!permission;
  const action = isEdit ? updatePermission : createPermission;
  const [state, formAction, isPending] = useActionState(action, {
    error: "",
  });

  const inputClass =
    "w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors";

  return (
    <form action={formAction} className="space-y-5">
      {isEdit && <input type="hidden" name="id" value={permission.id} />}

      {state.error !== "" && (
        <div className="bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-lg p-4">
          <p className="text-sm text-[var(--error)]">{state.error}</p>
        </div>
      )}

      {/* Permission Code */}
      <div>
        <label
          htmlFor="permissionCode"
          className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2"
        >
          <Code className="w-4 h-4 text-[var(--text-muted)]" />
          Permission Code <span className="text-[var(--error)]">*</span>
        </label>
        <input
          id="permissionCode"
          name="permissionCode"
          type="text"
          required
          defaultValue={permission?.permissionCode ?? ""}
          placeholder="e.g. AD_RESET_PASSWORD"
          className={`${inputClass} font-mono uppercase`}
        />
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Unique identifier. Will be auto-uppercased.
        </p>
      </div>

      {/* Permission Description */}
      <div>
        <label
          htmlFor="permissionDescription"
          className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2"
        >
          <FileText className="w-4 h-4 text-[var(--text-muted)]" />
          Description
        </label>
        <textarea
          id="permissionDescription"
          name="permissionDescription"
          rows={3}
          defaultValue={permission?.permissionDescription ?? ""}
          placeholder="Describe what this permission grants access to..."
          className={`${inputClass} resize-y`}
        />
      </div>

      {/* Enabled */}
      <label className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg cursor-pointer hover:border-[var(--accent)] transition-colors">
        <input
          type="checkbox"
          name="permissionEnabled"
          defaultChecked={permission?.permissionEnabled ?? true}
          className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
        />
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-sm text-[var(--text-primary)]">
            Permission Enabled
          </span>
        </div>
      </label>

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
              : "Create Permission"}
        </button>
      </div>
    </form>
  );
}
