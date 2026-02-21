/**
 * Pure utility functions for NinjaOne data formatting.
 * Safe for both server and client components (no server-only imports).
 */

import type { NinjaNodeClass } from "@/lib/types/ninja";

// ---------------------------------------------------------------------------
// Node class helpers
// ---------------------------------------------------------------------------

export function nodeClassColor(nc?: NinjaNodeClass): string {
  if (!nc) return "bg-[var(--text-muted)]/10 text-[var(--text-muted)]";
  if (nc === "WINDOWS_WORKSTATION") return "bg-blue-500/10 text-blue-400";
  if (nc === "WINDOWS_SERVER") return "bg-purple-500/10 text-purple-400";
  if (nc === "MAC" || nc === "MAC_SERVER")
    return "bg-gray-500/10 text-gray-400";
  if (nc.startsWith("LINUX")) return "bg-green-500/10 text-green-400";
  if (nc.startsWith("NMS")) return "bg-orange-500/10 text-orange-400";
  return "bg-[var(--text-muted)]/10 text-[var(--text-muted)]";
}

export function nodeClassLabel(nc?: NinjaNodeClass): string {
  if (!nc) return "Unknown";
  return nc
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Timestamp formatting
// ---------------------------------------------------------------------------

export function formatNinjaTime(timestamp?: number): string {
  if (!timestamp) return "\u2014";
  // NinjaOne may use seconds or milliseconds — handle both
  const ms = timestamp < 2e10 ? timestamp * 1000 : timestamp;
  const diffMs = Date.now() - ms;
  if (diffMs < 0) return "just now";
  if (diffMs < 60_000) return "just now";
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)} min ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
  return `${Math.floor(diffMs / 86_400_000)}d ago`;
}
