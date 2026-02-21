"use client";

import { useActionState } from "react";
import { createCustomField } from "@/app/dashboard/settings/custom-fields/actions";
import { useState } from "react";

export function CustomFieldForm() {
  const [state, formAction, isPending] = useActionState(createCustomField, {
    error: "",
  });
  const [fieldType, setFieldType] = useState("text");

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="bg-[var(--error)]/10 text-[var(--error)] text-sm px-4 py-2 rounded-lg">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
            Entity Type
          </label>
          <select
            name="entityType"
            className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="tenant">Tenant</option>
            <option value="task">Task</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
            Field Name
          </label>
          <input
            type="text"
            name="fieldName"
            required
            maxLength={100}
            placeholder="e.g., SLA Level"
            className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
            Field Type
          </label>
          <select
            name="fieldType"
            value={fieldType}
            onChange={(e) => setFieldType(e.target.value)}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="select">Select (Dropdown)</option>
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2 mt-6">
            <input type="hidden" name="isRequired" value="false" />
            <input
              type="checkbox"
              name="isRequired"
              value="true"
              className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
            />
            <span className="text-sm text-[var(--text-secondary)]">
              Required field
            </span>
          </label>
        </div>
      </div>

      {fieldType === "select" && (
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
            Options (comma-separated)
          </label>
          <input
            type="text"
            name="options"
            placeholder="e.g., Low, Medium, High, Critical"
            className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 bg-[var(--accent)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {isPending ? "Creating..." : "Create Field"}
      </button>
    </form>
  );
}
