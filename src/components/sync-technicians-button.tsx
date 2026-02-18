"use client";

import { useState, useTransition } from "react";
import { syncTechnicians } from "@/app/dashboard/technicians/actions";
import { RefreshCw, Loader2, CheckCircle2, XCircle } from "lucide-react";

export function SyncTechniciansButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  function handleSync() {
    setResult(null);
    startTransition(async () => {
      const res = await syncTechnicians();
      setResult(res);
      setTimeout(() => setResult(null), 5000);
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleSync}
        disabled={isPending}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <RefreshCw className="w-4 h-4" />
        )}
        Sync from Azure AD
      </button>

      {result && (
        <div
          className={`text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 ${
            result.success
              ? "bg-[var(--success)]/10 text-[var(--success)]"
              : "bg-[var(--error)]/10 text-[var(--error)]"
          }`}
        >
          {result.success ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : (
            <XCircle className="w-3 h-3" />
          )}
          {result.message || result.error}
        </div>
      )}
    </div>
  );
}
