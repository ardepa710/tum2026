"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Zap, Cog, User } from "lucide-react";

export function RunFilters({
  statuses,
  tasks,
  actors,
}: {
  statuses: string[];
  tasks: { id: number; taskName: string }[];
  actors: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const current = {
    status: searchParams.get("status") ?? "",
    task: searchParams.get("task") ?? "",
    actor: searchParams.get("actor") ?? "",
  };

  function navigate(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (value) {
      p.set(key, value);
    } else {
      p.delete(key);
    }
    p.delete("page"); // Reset to page 1 on filter change
    const qs = p.toString();
    router.push(`/dashboard/runs${qs ? `?${qs}` : ""}`);
  }

  const hasFilters = current.status || current.task || current.actor;

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-[var(--text-muted)]" />
        <select
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          value={current.status}
          onChange={(e) => navigate("status", e.target.value)}
        >
          <option value="">All Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Cog className="w-4 h-4 text-[var(--text-muted)]" />
        <select
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          value={current.task}
          onChange={(e) => navigate("task", e.target.value)}
        >
          <option value="">All Tasks</option>
          {tasks.map((t) => (
            <option key={t.id} value={String(t.id)}>{t.taskName}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-[var(--text-muted)]" />
        <select
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          value={current.actor}
          onChange={(e) => navigate("actor", e.target.value)}
        >
          <option value="">All Actors</option>
          {actors.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <button
          onClick={() => router.push("/dashboard/runs")}
          className="text-sm text-[var(--accent)] hover:underline flex items-center"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
