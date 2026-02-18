export function HealthBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-[var(--success)]/15 text-[var(--success)]"
      : score >= 50
        ? "bg-[var(--warning)]/15 text-[var(--warning)]"
        : "bg-[var(--error)]/15 text-[var(--error)]";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${color}`}
    >
      {score}
    </span>
  );
}
