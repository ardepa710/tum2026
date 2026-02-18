"use client";

import { useActionState } from "react";
import {
  createMasterTask,
  updateMasterTask,
} from "@/app/dashboard/tasks/actions";
import {
  Loader2,
  FileText,
  Code,
  Ticket,
  UserCheck,
  RefreshCw,
  Webhook,
  Building2,
  FolderOpen,
  Monitor,
} from "lucide-react";

type MasterTaskData = {
  id: number;
  taskName: string;
  taskDetails: string | null;
  taskCode: string;
  ticketRequired: boolean;
  usernameRequired: boolean;
  syncRequired: boolean;
  rewstWebhook: string | null;
  tenantExclusive: string | null;
  taskGroup: string | null;
  systemMgr: string | null;
} | null;

export function MasterTaskForm({ task }: { task?: MasterTaskData }) {
  const isEdit = !!task;
  const action = isEdit ? updateMasterTask : createMasterTask;
  const [state, formAction, isPending] = useActionState(action, {
    error: "",
  });

  const inputClass =
    "w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors";

  return (
    <form action={formAction} className="space-y-5">
      {isEdit && <input type="hidden" name="id" value={task.id} />}

      {state.error !== "" && (
        <div className="bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-lg p-4">
          <p className="text-sm text-[var(--error)]">{state.error}</p>
        </div>
      )}

      {/* Task Name */}
      <div>
        <label
          htmlFor="taskName"
          className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2"
        >
          <FileText className="w-4 h-4 text-[var(--text-muted)]" />
          Task Name <span className="text-[var(--error)]">*</span>
        </label>
        <input
          id="taskName"
          name="taskName"
          type="text"
          required
          defaultValue={task?.taskName ?? ""}
          placeholder="e.g. Reset User Password"
          className={inputClass}
        />
      </div>

      {/* Task Code */}
      <div>
        <label
          htmlFor="taskCode"
          className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2"
        >
          <Code className="w-4 h-4 text-[var(--text-muted)]" />
          Task Code <span className="text-[var(--error)]">*</span>
        </label>
        <input
          id="taskCode"
          name="taskCode"
          type="text"
          required
          defaultValue={task?.taskCode ?? ""}
          placeholder="e.g. RESET_PWD"
          className={`${inputClass} font-mono`}
        />
      </div>

      {/* Task Details */}
      <div>
        <label
          htmlFor="taskDetails"
          className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2"
        >
          <FileText className="w-4 h-4 text-[var(--text-muted)]" />
          Task Details
        </label>
        <textarea
          id="taskDetails"
          name="taskDetails"
          rows={3}
          defaultValue={task?.taskDetails ?? ""}
          placeholder="Describe what this task does..."
          className={`${inputClass} resize-y`}
        />
      </div>

      {/* Configuration Flags */}
      <div className="border-t border-[var(--border)] pt-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
          Configuration Flags
        </h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Define what inputs this task requires when executed.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Ticket Required */}
        <label className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg cursor-pointer hover:border-[var(--accent)] transition-colors">
          <input
            type="checkbox"
            name="ticketRequired"
            defaultChecked={task?.ticketRequired ?? false}
            className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
          />
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-sm text-[var(--text-primary)]">
              Ticket Required
            </span>
          </div>
        </label>

        {/* Username Required */}
        <label className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg cursor-pointer hover:border-[var(--accent)] transition-colors">
          <input
            type="checkbox"
            name="usernameRequired"
            defaultChecked={task?.usernameRequired ?? false}
            className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
          />
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-sm text-[var(--text-primary)]">
              Username Required
            </span>
          </div>
        </label>

        {/* Sync Required */}
        <label className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg cursor-pointer hover:border-[var(--accent)] transition-colors">
          <input
            type="checkbox"
            name="syncRequired"
            defaultChecked={task?.syncRequired ?? false}
            className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
          />
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-sm text-[var(--text-primary)]">
              Sync Required
            </span>
          </div>
        </label>
      </div>

      {/* Integration */}
      <div className="border-t border-[var(--border)] pt-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
          Integration
        </h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Rewst webhook and tenant assignment settings.
        </p>
      </div>

      {/* Rewst Webhook */}
      <div>
        <label
          htmlFor="rewstWebhook"
          className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2"
        >
          <Webhook className="w-4 h-4 text-[var(--text-muted)]" />
          Rewst Webhook
        </label>
        <input
          id="rewstWebhook"
          name="rewstWebhook"
          type="url"
          defaultValue={task?.rewstWebhook ?? ""}
          placeholder="https://engine.rewst.io/webhooks/..."
          className={`${inputClass} font-mono`}
        />
      </div>

      {/* Tenant Exclusive */}
      <div>
        <label
          htmlFor="tenantExclusive"
          className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2"
        >
          <Building2 className="w-4 h-4 text-[var(--text-muted)]" />
          Tenant Exclusive
        </label>
        <input
          id="tenantExclusive"
          name="tenantExclusive"
          type="text"
          defaultValue={task?.tenantExclusive ?? ""}
          placeholder="e.g. FSHC, AHI (comma-separated or blank for all)"
          className={inputClass}
        />
      </div>

      {/* Access Control */}
      <div className="border-t border-[var(--border)] pt-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
          Access Control
        </h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Grouping, system manager, and permission settings.
        </p>
      </div>

      {/* Task Group */}
      <div>
        <label
          htmlFor="taskGroup"
          className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2"
        >
          <FolderOpen className="w-4 h-4 text-[var(--text-muted)]" />
          Task Group
        </label>
        <input
          id="taskGroup"
          name="taskGroup"
          type="text"
          defaultValue={task?.taskGroup ?? ""}
          placeholder="e.g. User Management"
          className={inputClass}
        />
      </div>

      {/* System Manager */}
      <div>
        <label
          htmlFor="systemMgr"
          className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2"
        >
          <Monitor className="w-4 h-4 text-[var(--text-muted)]" />
          System Manager
        </label>
        <input
          id="systemMgr"
          name="systemMgr"
          type="text"
          defaultValue={task?.systemMgr ?? ""}
          placeholder="e.g. Microsoft 365"
          className={inputClass}
        />
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
              : "Create Task"}
        </button>
      </div>
    </form>
  );
}
