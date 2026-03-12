"use client";

import { useState } from "react";
import { UserX, UserCheck, Unlock, KeyRound, Loader2 } from "lucide-react";

type Action = "disable" | "enable" | "unlock" | "reset-password";

interface Props {
  tenantId: number;
  samAccountName: string;
  accountEnabled: boolean;
  lockedOut: boolean;
  onSuccess?: () => void;
}

export function AdUserActions({
  tenantId,
  samAccountName,
  accountEnabled,
  lockedOut,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(action: Action, extraBody?: Record<string, string>) {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(
        `/api/tenants/${tenantId}/ad/users/${encodeURIComponent(samAccountName)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...extraBody }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Operation failed");
      } else {
        onSuccess?.();
        // Reload page to show updated status from DB
        window.location.reload();
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  }

  function handleResetPassword() {
    const pwd = window.prompt(
      `New password for ${samAccountName}:\n(User will be required to change it on next login)`
    );
    if (!pwd) return;
    if (pwd.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }
    runAction("reset-password", { password: pwd });
  }

  const isLoading = loading !== null;

  return (
    <div className="flex items-center gap-1">
      {error && (
        <span className="text-xs text-[var(--error)] mr-2 max-w-[160px] truncate" title={error}>
          {error}
        </span>
      )}

      {/* Disable / Enable */}
      {accountEnabled ? (
        <button
          onClick={() => runAction("disable")}
          disabled={isLoading}
          title="Disable account"
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors disabled:opacity-40"
        >
          {loading === "disable" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <UserX className="w-3.5 h-3.5" />
          )}
        </button>
      ) : (
        <button
          onClick={() => runAction("enable")}
          disabled={isLoading}
          title="Enable account"
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--success)] hover:bg-[var(--success)]/10 transition-colors disabled:opacity-40"
        >
          {loading === "enable" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <UserCheck className="w-3.5 h-3.5" />
          )}
        </button>
      )}

      {/* Unlock */}
      {lockedOut && (
        <button
          onClick={() => runAction("unlock")}
          disabled={isLoading}
          title="Unlock account"
          className="p-1.5 rounded-lg text-[var(--warning)] hover:bg-[var(--warning)]/10 transition-colors disabled:opacity-40"
        >
          {loading === "unlock" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Unlock className="w-3.5 h-3.5" />
          )}
        </button>
      )}

      {/* Reset Password */}
      <button
        onClick={handleResetPassword}
        disabled={isLoading}
        title="Reset password"
        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors disabled:opacity-40"
      >
        {loading === "reset-password" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <KeyRound className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
}
