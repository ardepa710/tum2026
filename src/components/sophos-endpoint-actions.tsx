"use client";

import { useState, useCallback } from "react";
import { Search, Loader2, CheckCircle, XCircle, Shield } from "lucide-react";
import { hasMinRole } from "@/lib/rbac-shared";
import type { Role } from "@/lib/rbac-shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionState = {
  loading: boolean;
  feedback: "success" | "error" | null;
  message?: string;
};

const INITIAL_STATE: ActionState = { loading: false, feedback: null };

// ---------------------------------------------------------------------------
// Hook: manages loading + brief feedback for an action
// ---------------------------------------------------------------------------

function useAction() {
  const [state, setState] = useState<ActionState>(INITIAL_STATE);

  const run = useCallback(async (fn: () => Promise<Response>) => {
    setState({ loading: true, feedback: null });
    try {
      const res = await fn();
      if (!res.ok) {
        const data = await res
          .json()
          .catch(() => ({ error: "Request failed" }));
        setState({
          loading: false,
          feedback: "error",
          message: data.error || "Request failed",
        });
      } else {
        setState({ loading: false, feedback: "success", message: "Done" });
      }
    } catch {
      setState({
        loading: false,
        feedback: "error",
        message: "Network error",
      });
    }
    setTimeout(() => setState(INITIAL_STATE), 3000);
  }, []);

  return { ...state, run };
}

// ---------------------------------------------------------------------------
// Feedback badge
// ---------------------------------------------------------------------------

function FeedbackBadge({
  feedback,
  message,
}: {
  feedback: "success" | "error";
  message?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
        feedback === "success"
          ? "bg-[var(--success)]/10 text-[var(--success)]"
          : "bg-[var(--error)]/10 text-[var(--error)]"
      }`}
    >
      {feedback === "success" ? (
        <CheckCircle className="w-3 h-3" />
      ) : (
        <XCircle className="w-3 h-3" />
      )}
      {message || (feedback === "success" ? "Done" : "Failed")}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

export function SophosEndpointActions({
  tenantId,
  endpointId,
  tamperEnabled,
  role,
}: {
  tenantId: number;
  endpointId: string;
  tamperEnabled?: boolean;
  role: string;
}) {
  if (!hasMinRole(role as Role, "EDITOR")) return null;

  const scanAction = useAction();
  const tamperAction = useAction();
  const [tamperState, setTamperState] = useState(tamperEnabled ?? false);

  const handleScan = () => {
    scanAction.run(() =>
      fetch(
        `/api/sophos/endpoints/${endpointId}/scan?tenantId=${tenantId}`,
        { method: "POST" },
      ),
    );
  };

  const handleTamperToggle = () => {
    const newState = !tamperState;

    // Confirm when DISABLING tamper protection
    if (!newState) {
      if (
        !window.confirm(
          "Are you sure you want to DISABLE tamper protection? This will leave the endpoint less protected.",
        )
      ) {
        return;
      }
    }

    tamperAction.run(async () => {
      const res = await fetch(
        `/api/sophos/endpoints/${endpointId}/tamper?tenantId=${tenantId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: newState }),
        },
      );
      if (res.ok) {
        setTamperState(newState);
      }
      return res;
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Start Scan */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleScan}
          disabled={scanAction.loading}
          className="inline-flex items-center gap-1.5 bg-[var(--accent)] text-white hover:bg-[var(--accent)]/80 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {scanAction.loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Search className="w-3.5 h-3.5" />
          )}
          Start Scan
        </button>
        {scanAction.feedback && (
          <FeedbackBadge
            feedback={scanAction.feedback}
            message={scanAction.message}
          />
        )}
      </div>

      {/* Tamper Protection Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleTamperToggle}
          disabled={tamperAction.loading}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            tamperState
              ? "bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20"
              : "bg-[var(--error)]/10 text-[var(--error)] hover:bg-[var(--error)]/20"
          }`}
        >
          {tamperAction.loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Shield className="w-3.5 h-3.5" />
          )}
          Tamper {tamperState ? "ON" : "OFF"}
          {/* Toggle switch */}
          <span
            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
              tamperState ? "bg-[var(--success)]" : "bg-[var(--text-muted)]"
            }`}
          >
            <span
              className={`inline-block h-3 w-3 rounded-full bg-white transition-transform ${
                tamperState ? "translate-x-3.5" : "translate-x-0.5"
              }`}
            />
          </span>
        </button>
        {tamperAction.feedback && (
          <FeedbackBadge
            feedback={tamperAction.feedback}
            message={tamperAction.message}
          />
        )}
      </div>
    </div>
  );
}
