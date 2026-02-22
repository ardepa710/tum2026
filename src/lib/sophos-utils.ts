/**
 * Client-safe utility functions for Sophos data.
 * NO server imports (no prisma, no auth, no sophos.ts).
 */

export function sophosHealthColor(health?: string): string {
  switch (health) {
    case "good":
      return "bg-green-500/10 text-green-400";
    case "suspicious":
      return "bg-yellow-500/10 text-yellow-400";
    case "bad":
      return "bg-red-500/10 text-red-400";
    default:
      return "bg-gray-500/10 text-gray-400";
  }
}

export function sophosHealthLabel(health?: string): string {
  switch (health) {
    case "good":
      return "Healthy";
    case "suspicious":
      return "Suspicious";
    case "bad":
      return "Unhealthy";
    default:
      return "Unknown";
  }
}

export function sophosSeverityColor(severity?: string): string {
  switch (severity) {
    case "high":
      return "bg-red-500/10 text-red-400";
    case "medium":
      return "bg-orange-500/10 text-orange-400";
    case "low":
      return "bg-yellow-500/10 text-yellow-400";
    default:
      return "bg-gray-500/10 text-gray-400";
  }
}

export function sophosSeverityLabel(severity?: string): string {
  switch (severity) {
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
    default:
      return "Unknown";
  }
}

export function sophosCheckColor(status?: string): string {
  switch (status) {
    case "green":
      return "bg-green-500/10 text-green-400";
    case "amber":
      return "bg-yellow-500/10 text-yellow-400";
    case "red":
      return "bg-red-500/10 text-red-400";
    default:
      return "bg-gray-500/10 text-gray-400";
  }
}

export function sophosEndpointTypeLabel(type?: string): string {
  return type === "server" ? "Server" : "Workstation";
}

export function formatSophosTime(iso?: string): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}
