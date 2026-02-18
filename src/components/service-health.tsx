"use client";

import { useState, useEffect } from "react";
import { Loader2, HeartPulse, ChevronDown, ChevronUp } from "lucide-react";

interface TenantInfo {
  id: number;
  tenantName: string;
  tenantAbbrv: string;
}

interface ServiceStatus {
  service: string;
  status: string;
  id: string;
}

interface ServiceIssue {
  id: string;
  service: string;
  title: string;
  classification: string;
  startDateTime: string;
  isResolved: boolean;
}

interface TenantHealth {
  tenant: TenantInfo;
  health: ServiceStatus[];
  issues: ServiceIssue[];
}

function statusColor(status: string): string {
  switch (status) {
    case "serviceOperational":
      return "var(--success)";
    case "serviceDegradation":
      return "var(--warning)";
    case "serviceInterruption":
      return "var(--error)";
    default:
      return "var(--text-muted)";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "serviceOperational":
      return "Operational";
    case "serviceDegradation":
      return "Degraded";
    case "serviceInterruption":
      return "Interrupted";
    default:
      return status;
  }
}

function classificationBadgeColor(classification: string): string {
  switch (classification) {
    case "advisory":
      return "bg-[var(--accent)]/15 text-[var(--accent)]";
    case "incident":
      return "bg-[var(--error)]/15 text-[var(--error)]";
    case "warning":
      return "bg-[var(--warning)]/15 text-[var(--warning)]";
    default:
      return "bg-[var(--text-muted)]/15 text-[var(--text-muted)]";
  }
}

function ServiceCard({
  service,
  issues,
}: {
  service: ServiceStatus;
  issues: ServiceIssue[];
}) {
  const [expanded, setExpanded] = useState(false);
  const color = statusColor(service.status);
  const serviceIssues = issues.filter((i) => i.service === service.service);

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg-hover)] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {service.service}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
              color,
            }}
          >
            {statusLabel(service.status)}
          </span>
          {serviceIssues.length > 0 && (
            <span className="text-xs text-[var(--text-muted)]">
              {serviceIssues.length} issue{serviceIssues.length !== 1 && "s"}
            </span>
          )}
          {serviceIssues.length > 0 ? (
            expanded ? (
              <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
            )
          ) : null}
        </div>
      </button>

      {expanded && serviceIssues.length > 0 && (
        <div className="border-t border-[var(--border)] px-4 py-3 space-y-3">
          {serviceIssues.map((issue) => (
            <div key={issue.id} className="flex flex-col gap-1">
              <div className="flex items-start gap-2">
                <span className="text-sm text-[var(--text-primary)]">
                  {issue.title}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${classificationBadgeColor(issue.classification)}`}
                >
                  {issue.classification}
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  Started{" "}
                  {new Date(issue.startDateTime).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ServiceHealth() {
  const [data, setData] = useState<TenantHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/service-health")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch service health");
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-[var(--accent)] animate-spin" />
        <span className="ml-3 text-sm text-[var(--text-secondary)]">
          Loading service health from all tenants...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="w-12 h-12 bg-[var(--error)]/10 rounded-xl flex items-center justify-center mx-auto mb-3">
          <HeartPulse className="w-6 h-6 text-[var(--error)]" />
        </div>
        <p className="text-sm text-[var(--error)]">{error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-12 h-12 bg-[var(--bg-hover)] rounded-xl flex items-center justify-center mx-auto mb-3">
          <HeartPulse className="w-6 h-6 text-[var(--text-muted)]" />
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          No service health data available.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {data.map(({ tenant, health, issues }) => {
        const totalServices = health.length;
        const operationalCount = health.filter(
          (s) => s.status === "serviceOperational"
        ).length;

        return (
          <div key={tenant.id}>
            {/* Tenant Header */}
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                {tenant.tenantName}
              </h3>
              <span className="text-xs text-[var(--text-muted)] font-mono bg-[var(--bg-hover)] px-2 py-0.5 rounded">
                {tenant.tenantAbbrv}
              </span>
              {totalServices > 0 && (
                <span className="text-xs text-[var(--text-secondary)]">
                  {operationalCount}/{totalServices} operational
                </span>
              )}
            </div>

            {/* Service Cards Grid */}
            {health.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] py-4">
                No service health data returned for this tenant.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {health.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    issues={issues}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
