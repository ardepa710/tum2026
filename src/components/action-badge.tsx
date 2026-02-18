export const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-[var(--success)]/15 text-[var(--success)]",
  UPDATE: "bg-[var(--accent)]/15 text-[var(--accent)]",
  DELETE: "bg-[var(--error)]/15 text-[var(--error)]",
  LOGIN: "bg-purple-500/15 text-purple-400",
  LOGOUT: "bg-purple-500/15 text-purple-400",
  SYNC: "bg-[var(--warning)]/15 text-[var(--warning)]",
  ASSIGN: "bg-emerald-500/15 text-emerald-400",
  REMOVE: "bg-orange-500/15 text-orange-400",
  SUCCESS: "bg-[var(--success)]/15 text-[var(--success)]",
  FAILED: "bg-[var(--error)]/15 text-[var(--error)]",
  RUNNING: "bg-[var(--accent)]/15 text-[var(--accent)]",
};

export function ActionBadge({ action }: { action: string }) {
  const color =
    ACTION_COLORS[action] ??
    "bg-[var(--bg-hover)] text-[var(--text-secondary)]";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}
    >
      {action}
    </span>
  );
}
