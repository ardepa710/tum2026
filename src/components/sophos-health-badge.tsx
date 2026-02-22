"use client";

import { sophosHealthColor, sophosHealthLabel } from "@/lib/sophos-utils";

export function SophosHealthBadge({ health }: { health?: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sophosHealthColor(health)}`}
    >
      {sophosHealthLabel(health)}
    </span>
  );
}
