"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { User, Box, Zap, Download, Calendar } from "lucide-react";

export function LogFilters({
  actors,
  entities,
  actions,
}: {
  actors: string[];
  entities: string[];
  actions: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const current = {
    actor: searchParams.get("actor") ?? "",
    entity: searchParams.get("entity") ?? "",
    action: searchParams.get("action") ?? "",
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
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
    router.push(`/dashboard/logs${qs ? `?${qs}` : ""}`);
  }

  function handleExport() {
    const p = new URLSearchParams();
    if (current.from) p.set("from", current.from);
    if (current.to) p.set("to", current.to);
    if (current.actor) p.set("actor", current.actor);
    if (current.entity) p.set("entity", current.entity);
    if (current.action) p.set("action", current.action);
    const qs = p.toString();
    window.location.href = `/api/logs/export${qs ? `?${qs}` : ""}`;
  }

  const hasFilters =
    current.actor || current.entity || current.action || current.from || current.to;

  return (
    <div className="flex flex-wrap gap-3 mb-4">
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

      <div className="flex items-center gap-2">
        <Box className="w-4 h-4 text-[var(--text-muted)]" />
        <select
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          value={current.entity}
          onChange={(e) => navigate("entity", e.target.value)}
        >
          <option value="">All Entities</option>
          {entities.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-[var(--text-muted)]" />
        <select
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          value={current.action}
          onChange={(e) => navigate("action", e.target.value)}
        >
          <option value="">All Actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
        <input
          type="date"
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          value={current.from}
          onChange={(e) => navigate("from", e.target.value)}
          placeholder="From"
        />
      </div>

      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
        <input
          type="date"
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          value={current.to}
          onChange={(e) => navigate("to", e.target.value)}
          placeholder="To"
        />
      </div>

      <button
        onClick={handleExport}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        Export CSV
      </button>

      {hasFilters && (
        <button
          onClick={() => router.push("/dashboard/logs")}
          className="text-sm text-[var(--accent)] hover:underline flex items-center"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
