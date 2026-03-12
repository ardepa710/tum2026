"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

interface SyncResult {
  usersUpserted: number;
  groupsUpserted: number;
  membershipsUpserted: number;
  errors: string[];
}

export function AdSyncButton({ tenantId }: { tenantId: number }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/ad/sync`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Sync failed");
      } else {
        setResult(json.data as SyncResult);
        // Reload page to reflect new data
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch {
      setError("Network error — could not reach sync endpoint");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleSync}
        disabled={loading}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
          bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20
          hover:bg-[var(--accent)]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Syncing AD..." : "Sync from AD"}
      </button>

      {result && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--success)]">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {result.usersUpserted} users · {result.groupsUpserted} groups synced
          {result.errors.length > 0 && (
            <span className="text-[var(--warning)]">
              · {result.errors.length} warning(s)
            </span>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--error)]">
          <AlertTriangle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}
    </div>
  );
}
