"use client";

import { useState, useCallback } from "react";
import {
  RotateCcw,
  Wrench,
  Search,
  Download,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  ChevronDown,
  Terminal,
  X,
} from "lucide-react";

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
        const data = await res.json().catch(() => ({ error: "Request failed" }));
        setState({ loading: false, feedback: "error", message: data.error || "Request failed" });
      } else {
        setState({ loading: false, feedback: "success", message: "Done" });
      }
    } catch {
      setState({ loading: false, feedback: "error", message: "Network error" });
    }
    // Clear feedback after 2.5 seconds
    setTimeout(() => setState(INITIAL_STATE), 2500);
  }, []);

  return { ...state, run };
}

// ---------------------------------------------------------------------------
// Feedback badge
// ---------------------------------------------------------------------------

function FeedbackBadge({ feedback, message }: { feedback: "success" | "error"; message?: string }) {
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
// Reboot Action
// ---------------------------------------------------------------------------

function RebootAction({ deviceId }: { deviceId: number }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"NORMAL" | "FORCED">("NORMAL");
  const [reason, setReason] = useState("");
  const action = useAction();

  const handleSubmit = () => {
    action.run(() =>
      fetch(`/api/ninja/devices/${deviceId}/reboot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, reason: reason || undefined }),
      }),
    );
    setOpen(false);
    setReason("");
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={action.loading}
        className="inline-flex items-center gap-1.5 bg-[var(--error)] text-white hover:bg-[var(--error)]/80 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {action.loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <RotateCcw className="w-3.5 h-3.5" />
        )}
        Reboot
      </button>

      {action.feedback && <FeedbackBadge feedback={action.feedback} message={action.message} />}

      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg p-4 w-72">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[var(--text-primary)]">Reboot Device</span>
            <button onClick={() => setOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">Mode</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode("NORMAL")}
                  className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
                    mode === "NORMAL"
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]"
                  }`}
                >
                  Normal
                </button>
                <button
                  onClick={() => setMode("FORCED")}
                  className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
                    mode === "FORCED"
                      ? "border-[var(--error)] bg-[var(--error)]/10 text-[var(--error)]"
                      : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]"
                  }`}
                >
                  Forced
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">
                Reason <span className="text-[var(--text-muted)]">(optional)</span>
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Maintenance, updates..."
                className="w-full px-3 py-1.5 text-sm bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 text-xs py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 text-xs py-1.5 rounded-lg bg-[var(--error)] text-white hover:bg-[var(--error)]/80 transition-colors font-medium"
              >
                Reboot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Maintenance Action
// ---------------------------------------------------------------------------

function MaintenanceAction({
  deviceId,
  maintenance,
}: {
  deviceId: number;
  maintenance?: { status?: string; end?: number };
}) {
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState(3600000); // 1 hour default
  const [reason, setReason] = useState("");
  const action = useAction();

  const isActive = !!maintenance?.status;

  const handleCancel = () => {
    action.run(() =>
      fetch(`/api/ninja/devices/${deviceId}/maintenance`, {
        method: "DELETE",
      }),
    );
  };

  const handleEnable = () => {
    action.run(() =>
      fetch(`/api/ninja/devices/${deviceId}/maintenance`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endTime: Date.now() + duration,
          reason: reason || undefined,
        }),
      }),
    );
    setOpen(false);
    setReason("");
  };

  const durations = [
    { label: "1h", value: 3600000 },
    { label: "4h", value: 14400000 },
    { label: "8h", value: 28800000 },
    { label: "24h", value: 86400000 },
  ];

  return (
    <div className="relative">
      {isActive ? (
        <button
          onClick={handleCancel}
          disabled={action.loading}
          className="inline-flex items-center gap-1.5 bg-[var(--warning)] text-white hover:bg-[var(--warning)]/80 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {action.loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Wrench className="w-3.5 h-3.5" />
          )}
          Cancel Maintenance
        </button>
      ) : (
        <button
          onClick={() => setOpen(!open)}
          disabled={action.loading}
          className="inline-flex items-center gap-1.5 bg-[var(--accent)] text-white hover:bg-[var(--accent)]/80 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {action.loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Wrench className="w-3.5 h-3.5" />
          )}
          Maintenance
        </button>
      )}

      {action.feedback && <FeedbackBadge feedback={action.feedback} message={action.message} />}

      {open && !isActive && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg p-4 w-72">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[var(--text-primary)]">Enable Maintenance</span>
            <button onClick={() => setOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">Duration</label>
              <div className="flex gap-1.5">
                {durations.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDuration(d.value)}
                    className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
                      duration === d.value
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">
                Reason <span className="text-[var(--text-muted)]">(optional)</span>
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Scheduled maintenance..."
                className="w-full px-3 py-1.5 text-sm bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 text-xs py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEnable}
                className="flex-1 text-xs py-1.5 rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent)]/80 transition-colors font-medium"
              >
                Enable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Patch Scan / Apply Dropdown
// ---------------------------------------------------------------------------

function PatchDropdown({
  deviceId,
  label,
  endpoint,
  icon: Icon,
  confirm,
  variant,
}: {
  deviceId: number;
  label: string;
  endpoint: string;
  icon: typeof Search;
  confirm?: boolean;
  variant: "accent" | "warning";
}) {
  const [open, setOpen] = useState(false);
  const action = useAction();

  const handleSelect = (type: "os" | "software" | "both") => {
    if (confirm && !window.confirm(`Are you sure you want to ${label.toLowerCase()} ${type === "both" ? "all" : type} patches?`)) {
      setOpen(false);
      return;
    }
    action.run(() =>
      fetch(`/api/ninja/devices/${deviceId}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      }),
    );
    setOpen(false);
  };

  const bgClass = variant === "accent"
    ? "bg-[var(--accent)] hover:bg-[var(--accent)]/80"
    : "bg-[var(--warning)] hover:bg-[var(--warning)]/80";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={action.loading}
        className={`inline-flex items-center gap-1.5 ${bgClass} text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {action.loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Icon className="w-3.5 h-3.5" />
        )}
        {label}
        <ChevronDown className="w-3 h-3" />
      </button>

      {action.feedback && <FeedbackBadge feedback={action.feedback} message={action.message} />}

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden min-w-[140px]">
          {(["os", "software", "both"] as const).map((type) => (
            <button
              key={type}
              onClick={() => handleSelect(type)}
              className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors capitalize"
            >
              {type === "os" ? "OS" : type === "software" ? "Software" : "Both"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Run Script Action
// ---------------------------------------------------------------------------

function RunScriptAction({ deviceId }: { deviceId: number }) {
  const [open, setOpen] = useState(false);
  const [scriptId, setScriptId] = useState("");
  const [params, setParams] = useState("");
  const action = useAction();

  const handleSubmit = () => {
    const id = Number(scriptId);
    if (isNaN(id) || id <= 0) return;

    let parameters: Record<string, string> | undefined;
    if (params.trim()) {
      try {
        parameters = JSON.parse(params.trim());
      } catch {
        // If not valid JSON, skip parameters
      }
    }

    action.run(() =>
      fetch(`/api/ninja/devices/${deviceId}/script`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptId: id, parameters }),
      }),
    );
    setOpen(false);
    setScriptId("");
    setParams("");
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={action.loading}
        className="inline-flex items-center gap-1.5 bg-[var(--accent)] text-white hover:bg-[var(--accent)]/80 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {action.loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Terminal className="w-3.5 h-3.5" />
        )}
        Run Script
      </button>

      {action.feedback && <FeedbackBadge feedback={action.feedback} message={action.message} />}

      {open && (
        <div className="absolute top-full right-0 mt-2 z-50 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg p-4 w-80">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[var(--text-primary)]">Run Script</span>
            <button onClick={() => setOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">Script ID</label>
              <input
                type="number"
                value={scriptId}
                onChange={(e) => setScriptId(e.target.value)}
                placeholder="e.g. 123"
                className="w-full px-3 py-1.5 text-sm bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">
                Parameters <span className="text-[var(--text-muted)]">(optional, JSON)</span>
              </label>
              <textarea
                value={params}
                onChange={(e) => setParams(e.target.value)}
                placeholder='{"key": "value"}'
                rows={3}
                className="w-full px-3 py-1.5 text-sm bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] resize-none font-mono"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 text-xs py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!scriptId || isNaN(Number(scriptId))}
                className="flex-1 text-xs py-1.5 rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent)]/80 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Execute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

export function NinjaDeviceActions({
  deviceId,
  role,
  maintenance,
}: {
  deviceId: number;
  role: string;
  maintenance?: { status?: string; end?: number };
}) {
  // Only EDITOR/ADMIN can see actions
  if (role !== "ADMIN" && role !== "EDITOR") {
    return null;
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
      <div className="flex flex-wrap items-center gap-2">
        <RebootAction deviceId={deviceId} />
        <MaintenanceAction deviceId={deviceId} maintenance={maintenance} />
        <PatchDropdown
          deviceId={deviceId}
          label="Patch Scan"
          endpoint="patch-scan"
          icon={Search}
          variant="accent"
        />
        <PatchDropdown
          deviceId={deviceId}
          label="Patch Apply"
          endpoint="patch-apply"
          icon={Download}
          confirm
          variant="warning"
        />
        <RunScriptAction deviceId={deviceId} />
      </div>
    </div>
  );
}
