import { generateAlerts, type Alert } from "@/lib/alerts";
import Link from "next/link";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  ExternalLink,
} from "lucide-react";

const SEVERITY_CONFIG: Record<
  Alert["severity"],
  {
    icon: typeof AlertCircle;
    color: string;
    bg: string;
    border: string;
    label: string;
  }
> = {
  error: {
    icon: AlertCircle,
    color: "text-[var(--error)]",
    bg: "bg-[var(--error)]/10",
    border: "border-[var(--error)]/30",
    label: "Errors",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-[var(--warning)]",
    bg: "bg-[var(--warning)]/10",
    border: "border-[var(--warning)]/30",
    label: "Warnings",
  },
  info: {
    icon: Info,
    color: "text-[var(--accent)]",
    bg: "bg-[var(--accent)]/10",
    border: "border-[var(--accent)]/30",
    label: "Info",
  },
};

export default async function AlertsPage() {
  const alerts = await generateAlerts();

  const grouped = {
    error: alerts.filter((a) => a.severity === "error"),
    warning: alerts.filter((a) => a.severity === "warning"),
    info: alerts.filter((a) => a.severity === "info"),
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6 flex items-center gap-3">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
          Alerts
        </h2>
        {alerts.length > 0 && (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[var(--error)]/15 text-[var(--error)]">
            {alerts.length}
          </span>
        )}
      </div>

      {/* Empty State */}
      {alerts.length === 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-14 h-14 bg-[var(--success)]/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-[var(--success)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
            No alerts
          </h3>
          <p className="text-sm text-[var(--text-muted)]">
            All systems are operating normally.
          </p>
        </div>
      )}

      {/* Severity Groups */}
      {(["error", "warning", "info"] as const).map((severity) => {
        const items = grouped[severity];
        if (items.length === 0) return null;
        const config = SEVERITY_CONFIG[severity];
        const Icon = config.icon;

        return (
          <div key={severity} className="mb-6">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Icon className={`w-4 h-4 ${config.color}`} />
              {config.label} ({items.length})
            </h3>
            <div className="space-y-3">
              {items.map((alert) => (
                <div
                  key={alert.id}
                  className={`${config.bg} border ${config.border} rounded-xl p-4 flex items-start gap-3`}
                >
                  <Icon
                    className={`w-5 h-5 ${config.color} shrink-0 mt-0.5`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {alert.title}
                      </p>
                      {alert.tenantName && (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                          {alert.tenantName}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {alert.description}
                    </p>
                  </div>
                  {alert.link && (
                    <Link
                      href={alert.link}
                      className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors flex items-center gap-1"
                    >
                      View
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
