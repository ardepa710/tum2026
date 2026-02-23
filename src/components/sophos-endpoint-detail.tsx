"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  ChevronRight,
  Monitor,
  Shield,
  Activity,
  Lock,
  Bell,
  Users,
  Link2,
} from "lucide-react";
import type {
  SophosEndpoint,
  SophosHealthCheck,
  SophosAlert,
} from "@/lib/types/sophos";
import {
  sophosHealthColor,
  sophosHealthLabel,
  sophosCheckColor,
  sophosEndpointTypeLabel,
  formatSophosTime,
} from "@/lib/sophos-utils";
import { SophosHealthBadge } from "@/components/sophos-health-badge";
import { SophosSeverityBadge } from "@/components/sophos-severity-badge";
import Link from "next/link";
import { SophosCrossLinkSection } from "@/components/sophos-cross-link-section";

// ---------------------------------------------------------------------------
// Section types
// ---------------------------------------------------------------------------

type SectionKey =
  | "overview"
  | "protection"
  | "health"
  | "isolation"
  | "alerts"
  | "groups"
  | "crossLink";

// ---------------------------------------------------------------------------
// Collapsible Section wrapper
// ---------------------------------------------------------------------------

function Section({
  title,
  icon,
  sectionKey,
  openSections,
  onToggle,
  badge,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  sectionKey: SectionKey;
  openSections: Set<SectionKey>;
  onToggle: (key: SectionKey) => void;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  const isOpen = openSections.has(sectionKey);
  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] overflow-hidden">
      <button
        onClick={() => onToggle(sectionKey)}
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg-primary)]/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-muted)]">{icon}</span>
          <span className="font-medium text-[var(--text-primary)]">
            {title}
          </span>
          {badge}
        </div>
        <ChevronRight
          className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${
            isOpen ? "rotate-90" : ""
          }`}
        />
      </button>
      {isOpen && (
        <div className="p-4 pt-0 border-t border-[var(--border)]">
          {children}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton for lazy sections
// ---------------------------------------------------------------------------

function SectionSkeleton() {
  return (
    <div className="py-6 flex items-center justify-center">
      <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
      <span className="ml-2 text-sm text-[var(--text-secondary)]">
        Loading...
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Info row helper
// ---------------------------------------------------------------------------

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-[var(--border)] last:border-b-0">
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <span className="text-sm text-[var(--text-primary)] text-right max-w-[60%]">
        {value || "\u2014"}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SophosEndpointDetail({
  endpoint,
  tenantId,
  role,
}: {
  endpoint: SophosEndpoint;
  tenantId: number;
  role: string;
}) {
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(
    new Set(["overview"]),
  );

  // Lazy-loaded data: undefined = not loaded, null = loaded but empty/failed
  const [healthData, setHealthData] = useState<
    SophosHealthCheck | null | undefined
  >(undefined);
  const [healthLoading, setHealthLoading] = useState(false);

  const [alertsData, setAlertsData] = useState<
    SophosAlert[] | null | undefined
  >(undefined);
  const [alertsLoading, setAlertsLoading] = useState(false);

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Lazy load health data when section first opened
  useEffect(() => {
    if (openSections.has("health") && healthData === undefined) {
      setHealthLoading(true);
      fetch(`/api/sophos/health?tenantId=${tenantId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => setHealthData(data))
        .catch(() => setHealthData(null))
        .finally(() => setHealthLoading(false));
    }
  }, [openSections, healthData, tenantId]);

  // Lazy load alerts when section first opened
  useEffect(() => {
    if (openSections.has("alerts") && alertsData === undefined) {
      setAlertsLoading(true);
      fetch(`/api/sophos/alerts?tenantId=${tenantId}&pageSize=10`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => setAlertsData(data?.items ?? []))
        .catch(() => setAlertsData(null))
        .finally(() => setAlertsLoading(false));
    }
  }, [openSections, alertsData, tenantId]);

  return (
    <div className="space-y-3">
      {/* Section 1: Overview (default open) */}
      <Section
        title="Overview"
        icon={<Monitor className="w-4 h-4" />}
        sectionKey="overview"
        openSections={openSections}
        onToggle={toggleSection}
      >
        <div className="pt-3 space-y-0">
          <InfoRow label="Hostname" value={endpoint.hostname} />
          <InfoRow
            label="Type"
            value={sophosEndpointTypeLabel(endpoint.type)}
          />
          <InfoRow label="OS" value={endpoint.os?.name} />
          <InfoRow
            label="OS Platform"
            value={endpoint.os?.platform}
          />
          <InfoRow
            label="IPv4"
            value={endpoint.ipv4Addresses?.join(", ")}
          />
          <InfoRow
            label="IPv6"
            value={endpoint.ipv6Addresses?.join(", ")}
          />
          <InfoRow
            label="MAC Addresses"
            value={endpoint.macAddresses?.join(", ")}
          />
          <InfoRow
            label="Last Seen"
            value={formatSophosTime(endpoint.lastSeenAt)}
          />
          <InfoRow
            label="Associated Person"
            value={
              endpoint.associatedPerson?.name ||
              endpoint.associatedPerson?.viaLogin
            }
          />
        </div>
      </Section>

      {/* Section 2: Protection */}
      <Section
        title="Protection"
        icon={<Shield className="w-4 h-4" />}
        sectionKey="protection"
        openSections={openSections}
        onToggle={toggleSection}
        badge={
          <SophosHealthBadge health={endpoint.health?.overall} />
        }
      >
        <div className="pt-3 space-y-4">
          <InfoRow
            label="Tamper Protection"
            value={
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  endpoint.tamperProtectionEnabled
                    ? "bg-green-500/10 text-green-400"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                {endpoint.tamperProtectionEnabled ? "Enabled" : "Disabled"}
              </span>
            }
          />
          <InfoRow
            label="Threat Status"
            value={
              endpoint.health?.threats?.status ? (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sophosHealthColor(
                    endpoint.health.threats.status === "good" ? "good" : "bad",
                  )}`}
                >
                  {endpoint.health.threats.status}
                </span>
              ) : (
                "\u2014"
              )
            }
          />
          <InfoRow
            label="Services Status"
            value={
              endpoint.health?.services?.status ? (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sophosHealthColor(
                    endpoint.health.services.status === "good"
                      ? "good"
                      : "bad",
                  )}`}
                >
                  {endpoint.health.services.status}
                </span>
              ) : (
                "\u2014"
              )
            }
          />

          {/* Assigned Products */}
          {endpoint.assignedProducts && endpoint.assignedProducts.length > 0 && (
            <div>
              <span className="text-xs font-medium text-[var(--text-secondary)] block mb-2">
                Assigned Products
              </span>
              <div className="space-y-1">
                {endpoint.assignedProducts.map((product) => (
                  <div
                    key={product.code}
                    className="flex items-center justify-between text-sm px-3 py-1.5 bg-[var(--bg-primary)] rounded-lg"
                  >
                    <span className="text-[var(--text-primary)]">
                      {product.code}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-muted)]">
                        v{product.version}
                      </span>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                          product.status === "installed"
                            ? "bg-green-500/10 text-green-400"
                            : "bg-yellow-500/10 text-yellow-400"
                        }`}
                      >
                        {product.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Section 3: Health Check (lazy-loaded) */}
      <Section
        title="Health Check"
        icon={<Activity className="w-4 h-4" />}
        sectionKey="health"
        openSections={openSections}
        onToggle={toggleSection}
      >
        {healthLoading ? (
          <SectionSkeleton />
        ) : healthData === null ? (
          <p className="pt-3 text-sm text-[var(--text-muted)]">
            Unable to load health check data.
          </p>
        ) : healthData === undefined ? (
          <SectionSkeleton />
        ) : (
          <div className="pt-3 space-y-0">
            {(
              [
                ["Protection", healthData.endpoint?.protection],
                ["Policy", healthData.endpoint?.policy],
                ["Exclusions", healthData.endpoint?.exclusions],
                [
                  "Tamper Protection",
                  healthData.endpoint?.tamperProtection,
                ],
              ] as const
            ).map(([label, check]) => (
              <div
                key={label}
                className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-b-0"
              >
                <span className="text-sm text-[var(--text-secondary)]">
                  {label}
                </span>
                <div className="flex items-center gap-2">
                  {check?.summary && (
                    <span className="text-xs text-[var(--text-muted)] max-w-[200px] truncate">
                      {check.summary}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sophosCheckColor(
                      check?.status,
                    )}`}
                  >
                    {check?.status
                      ? check.status.charAt(0).toUpperCase() +
                        check.status.slice(1)
                      : "Unknown"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Section 4: Isolation (read-only) */}
      <Section
        title="Isolation"
        icon={<Lock className="w-4 h-4" />}
        sectionKey="isolation"
        openSections={openSections}
        onToggle={toggleSection}
        badge={
          endpoint.isolation?.status === "isolated" ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
              Isolated
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
              Not Isolated
            </span>
          )
        }
      >
        <div className="pt-3 space-y-0">
          <InfoRow
            label="Status"
            value={
              endpoint.isolation?.status === "isolated" ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
                  Isolated
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
                  Not Isolated
                </span>
              )
            }
          />
          <InfoRow
            label="Admin Isolated"
            value={
              endpoint.isolation?.adminIsolated ? "Yes" : "No"
            }
          />
        </div>
      </Section>

      {/* Section 5: Alerts (lazy-loaded) */}
      <Section
        title="Alerts"
        icon={<Bell className="w-4 h-4" />}
        sectionKey="alerts"
        openSections={openSections}
        onToggle={toggleSection}
        badge={
          alertsData && alertsData.length > 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--error)]/10 text-[var(--error)]">
              {alertsData.length}
            </span>
          ) : undefined
        }
      >
        {alertsLoading ? (
          <SectionSkeleton />
        ) : alertsData === null ? (
          <p className="pt-3 text-sm text-[var(--text-muted)]">
            Unable to load alerts.
          </p>
        ) : alertsData === undefined ? (
          <SectionSkeleton />
        ) : alertsData.length === 0 ? (
          <p className="pt-3 text-sm text-[var(--text-muted)]">
            No recent alerts.
          </p>
        ) : (
          <div className="pt-3 space-y-2">
            {alertsData.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-3 bg-[var(--bg-primary)] rounded-lg"
              >
                <SophosSeverityBadge severity={alert.severity} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-primary)] truncate">
                    {alert.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[var(--text-muted)]">
                      {alert.category}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {alert.product}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {formatSophosTime(alert.raisedAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Section 6: Groups */}
      <Section
        title="Groups"
        icon={<Users className="w-4 h-4" />}
        sectionKey="groups"
        openSections={openSections}
        onToggle={toggleSection}
      >
        <div className="pt-3">
          {endpoint.group ? (
            <div className="flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded-lg">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {endpoint.group.name}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  ID: {endpoint.group.id}
                </p>
              </div>
              <Link
                href={`/dashboard/sophos/groups/${endpoint.group.id}?tenantId=${tenantId}`}
                className="text-xs text-[var(--accent)] hover:underline"
              >
                View Group
              </Link>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              Not assigned to any group.
            </p>
          )}
        </div>
      </Section>

      {/* Section 7: Linked RMM Device (cross-link) */}
      <Section
        title="Linked RMM Device"
        icon={<Link2 className="w-4 h-4" />}
        sectionKey="crossLink"
        openSections={openSections}
        onToggle={toggleSection}
      >
        <SophosCrossLinkSection
          tenantId={tenantId}
          sophosEndpointId={endpoint.id}
          sophosEndpointName={endpoint.hostname}
          role={role}
        />
      </Section>
    </div>
  );
}
