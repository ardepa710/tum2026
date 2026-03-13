"use client";

import { useEffect, useState } from "react";
import type { TaskFieldSchema } from "@/lib/types/task-schema";

type AvailableTask = {
  id: number;
  taskName: string;
  taskCode: string;
  taskDetails: string | null;
  ticketRequired: boolean;
  usernameRequired: boolean;
  syncRequired: boolean;
  taskGroup: string | null;
  additionalDataSchema: string | null;
};

type RunResult = {
  ok: boolean;
  taskRunId?: number;
  error?: string;
};

type Props = {
  targetUser: string;
  tenantId: number;
};

export function RunTaskForm({ targetUser, tenantId }: Props) {
  const [tasks, setTasks] = useState<AvailableTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<AvailableTask | null>(null);
  const [ticketNumber, setTicketNumber] = useState("");
  const [additionalData, setAdditionalData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);

  useEffect(() => {
    fetch("/api/tech/available-tasks")
      .then((r) => r.json())
      .then((data: AvailableTask[]) => setTasks(Array.isArray(data) ? data : []))
      .catch(() => setTasks([]));
  }, []);

  const parsedSchema: TaskFieldSchema[] = (() => {
    if (!selectedTask?.additionalDataSchema) return [];
    try {
      const raw = JSON.parse(selectedTask.additionalDataSchema);
      if (!Array.isArray(raw)) return [];
      // Only keep items that have a valid name, label, and type
      return (raw as TaskFieldSchema[]).filter(
        (f) => f && typeof f.name === "string" && f.name.trim() !== "" &&
               typeof f.label === "string" && typeof f.type === "string"
      );
    } catch {
      return [];
    }
  })();

  // Group tasks by taskGroup
  const grouped = tasks.reduce<Record<string, AvailableTask[]>>((acc, t) => {
    const g = t.taskGroup ?? "General";
    if (!acc[g]) acc[g] = [];
    acc[g].push(t);
    return acc;
  }, {});

  function handleTaskChange(taskId: string) {
    const task = tasks.find((t) => t.id === Number(taskId)) ?? null;
    setSelectedTask(task);
    setTicketNumber("");
    setAdditionalData({});
    setResult(null);
  }

  function handleFieldChange(name: string, value: string) {
    setAdditionalData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTask) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/tech/tasks/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: selectedTask.id,
          targetUser,
          tenantId,
          ticketNumber: ticketNumber || undefined,
          additionalData: Object.keys(additionalData).length ? additionalData : undefined,
        }),
      });

      const data = await res.json();
      setResult({
        ok: data.ok === true,
        taskRunId: data.taskRun?.id,
        error: data.error,
      });
    } catch {
      setResult({ ok: false, error: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[var(--bg1)] border border-[var(--border)] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-[var(--text1)] mb-4 flex items-center gap-2">
        <span className="text-[var(--blue)]">⚡</span>
        Run Task
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Task selector */}
        <div>
          <label className="block text-xs font-medium text-[var(--text2)] mb-1">
            Select Task
          </label>
          <select
            className="w-full bg-[var(--bg0)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text1)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
            value={selectedTask?.id ?? ""}
            onChange={(e) => handleTaskChange(e.target.value)}
            required
          >
            <option value="">— Choose a task —</option>
            {Object.entries(grouped).map(([group, groupTasks]) => (
              <optgroup key={group} label={group}>
                {groupTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.taskName}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Task description + badges */}
        {selectedTask && (
          <div className="space-y-2">
            {selectedTask.taskDetails && (
              <p className="text-xs text-[var(--text3)] bg-[var(--bg0)] rounded-lg px-3 py-2">
                {selectedTask.taskDetails}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {selectedTask.ticketRequired && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  TICKET REQUIRED
                </span>
              )}
              {selectedTask.usernameRequired && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  APPLIES TO: {targetUser}
                </span>
              )}
              {selectedTask.syncRequired && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  SYNC REQUIRED
                </span>
              )}
            </div>
          </div>
        )}

        {/* Ticket number */}
        {selectedTask?.ticketRequired && (
          <div>
            <label className="block text-xs font-medium text-[var(--text2)] mb-1">
              Freshservice Ticket #
              <span className="text-red-400 ml-1">*</span>
            </label>
            <input
              type="text"
              className="w-full bg-[var(--bg0)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text1)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
              placeholder="e.g. 12345"
              value={ticketNumber}
              onChange={(e) => setTicketNumber(e.target.value)}
              required
            />
          </div>
        )}

        {/* Dynamic additional_data fields */}
        {parsedSchema.map((field) => (
          <div key={field.name}>
            <label className="block text-xs font-medium text-[var(--text2)] mb-1">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </label>

            {field.type === "textarea" ? (
              <textarea
                rows={3}
                className="w-full bg-[var(--bg0)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text1)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)] resize-none"
                placeholder={field.placeholder}
                value={additionalData[field.name] ?? ""}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                required={field.required}
              />
            ) : field.type === "select" ? (
              <select
                className="w-full bg-[var(--bg0)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text1)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
                value={additionalData[field.name] ?? ""}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                required={field.required}
              >
                <option value="">— Select —</option>
                {(field.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : field.type === "checkbox" ? (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`field-${field.name}`}
                  className="w-4 h-4 rounded accent-[var(--blue)]"
                  checked={additionalData[field.name] === "true"}
                  onChange={(e) =>
                    handleFieldChange(field.name, e.target.checked ? "true" : "false")
                  }
                />
                <label
                  htmlFor={`field-${field.name}`}
                  className="text-sm text-[var(--text2)]"
                >
                  {field.label}
                </label>
              </div>
            ) : (
              <input
                type={field.type === "number" ? "number" : "text"}
                className="w-full bg-[var(--bg0)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text1)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
                placeholder={field.placeholder}
                value={additionalData[field.name] ?? ""}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                required={field.required}
              />
            )}
          </div>
        ))}

        {/* Submit */}
        <button
          type="submit"
          disabled={!selectedTask || loading}
          className="w-full bg-[var(--blue)] hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Executing…
            </>
          ) : (
            "Submit Task"
          )}
        </button>

        {/* Result */}
        {result && (
          <div
            className={`rounded-lg px-4 py-3 text-sm font-medium flex items-start gap-2 ${
              result.ok
                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}
          >
            <span>{result.ok ? "✓" : "✗"}</span>
            <span>
              {result.ok
                ? `Task submitted successfully${result.taskRunId ? ` (Run #${result.taskRunId})` : ""}`
                : result.error ?? "Task execution failed"}
            </span>
          </div>
        )}
      </form>
    </div>
  );
}
