"use client";

import { useRef, useTransition } from "react";
import { updateNotificationPrefs } from "@/app/dashboard/settings/actions";

interface NotificationPrefs {
  onTaskRun: boolean;
  onTaskFail: boolean;
  onTechSync: boolean;
  onNewTenant: boolean;
}

export function NotificationPrefsForm({ initialPrefs }: { initialPrefs: NotificationPrefs }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(() => updateNotificationPrefs(formData));
  }

  const checkboxes = [
    { name: "onTaskRun", label: "Task Executed", description: "When a task run completes successfully", defaultChecked: initialPrefs.onTaskRun },
    { name: "onTaskFail", label: "Task Failed", description: "When a task run fails with an error", defaultChecked: initialPrefs.onTaskFail },
    { name: "onTechSync", label: "Technician Sync", description: "When technicians are synced from Azure AD", defaultChecked: initialPrefs.onTechSync },
    { name: "onNewTenant", label: "New Tenant", description: "When a new tenant is added to the system", defaultChecked: initialPrefs.onNewTenant },
  ];

  return (
    <form ref={formRef} action={handleSubmit}>
      <div className="space-y-4">
        {checkboxes.map((cb) => (
          <label key={cb.name} className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              name={cb.name}
              defaultChecked={cb.defaultChecked}
              className="mt-1 w-4 h-4 rounded border-[var(--border)] bg-[var(--bg-primary)] accent-[var(--accent)]"
            />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                {cb.label}
              </p>
              <p className="text-xs text-[var(--text-muted)]">{cb.description}</p>
            </div>
          </label>
        ))}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="mt-6 px-4 py-2 bg-[var(--accent)] text-white text-sm font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Save Preferences"}
      </button>
    </form>
  );
}
