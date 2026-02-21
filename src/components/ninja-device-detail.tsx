"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronRight,
  Cpu,
  HardDrive,
  Network,
  Package,
  Shield,
  Settings,
  Bell,
  Users,
  Search,
  Monitor,
  AlertTriangle,
  Play,
  Square,
  RotateCcw,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { NinjaDeviceActions } from "@/components/ninja-device-actions";
import { NinjaDeviceAssignment } from "@/components/ninja-device-assignment";
import type {
  NinjaDevice,
  NinjaAlert,
  NinjaDisk,
  NinjaSoftware,
  NinjaOsPatch,
  NinjaNetworkInterface,
  NinjaProcessor,
  NinjaVolume,
  NinjaWindowsService,
} from "@/lib/types/ninja";
import { nodeClassColor, nodeClassLabel, formatNinjaTime } from "@/lib/ninja-utils";

function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === null) return "\u2014";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function severityColor(severity?: string): string {
  if (!severity) return "text-[var(--text-muted)]";
  const s = severity.toUpperCase();
  if (s === "CRITICAL" || s === "HIGH") return "text-[var(--error)]";
  if (s === "MODERATE" || s === "MEDIUM" || s === "WARNING")
    return "text-[var(--warning)]";
  if (s === "LOW" || s === "INFORMATIONAL") return "text-[var(--accent)]";
  return "text-[var(--text-muted)]";
}

function severityBadge(severity?: string): string {
  if (!severity) return "bg-[var(--text-muted)]/10 text-[var(--text-muted)]";
  const s = severity.toUpperCase();
  if (s === "CRITICAL" || s === "HIGH")
    return "bg-[var(--error)]/10 text-[var(--error)]";
  if (s === "MODERATE" || s === "MEDIUM" || s === "WARNING")
    return "bg-[var(--warning)]/10 text-[var(--warning)]";
  if (s === "LOW" || s === "INFORMATIONAL")
    return "bg-[var(--accent)]/10 text-[var(--accent)]";
  return "bg-[var(--text-muted)]/10 text-[var(--text-muted)]";
}

function serviceStateBadge(state?: string): string {
  if (!state) return "bg-[var(--text-muted)]/10 text-[var(--text-muted)]";
  const s = state.toUpperCase();
  if (s === "RUNNING") return "bg-[var(--success)]/10 text-[var(--success)]";
  if (s === "STOPPED") return "bg-[var(--error)]/10 text-[var(--error)]";
  return "bg-[var(--warning)]/10 text-[var(--warning)]";
}

// ---------------------------------------------------------------------------
// Types for section data
// ---------------------------------------------------------------------------

interface HardwareData {
  processors: NinjaProcessor[];
  volumes: NinjaVolume[];
  disks: NinjaDisk[];
  networkInterfaces: NinjaNetworkInterface[];
}

interface PatchData {
  osPatches: NinjaOsPatch[];
  softwarePatches: NinjaOsPatch[];
}

type SectionKey =
  | "overview"
  | "hardware"
  | "network"
  | "software"
  | "patches"
  | "services"
  | "alerts"
  | "assignment";

// ---------------------------------------------------------------------------
// Collapsible Section wrapper
// ---------------------------------------------------------------------------

function Section({
  id,
  title,
  icon,
  isOpen,
  onToggle,
  badge,
  children,
}: {
  id: SectionKey;
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: (id: SectionKey) => void;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-muted)]">{icon}</span>
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {title}
          </span>
          {badge}
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
        )}
      </button>
      {isOpen && (
        <div className="border-t border-[var(--border)]">{children}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function SectionSkeleton() {
  return (
    <div className="px-4 py-6 flex items-center justify-center">
      <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
      <span className="ml-2 text-sm text-[var(--text-secondary)]">
        Loading...
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function NinjaDeviceDetail({
  deviceId,
  role,
}: {
  deviceId: number;
  role: string;
}) {
  // Device detail state
  const [device, setDevice] = useState<NinjaDevice | null>(null);
  const [deviceLoading, setDeviceLoading] = useState(true);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  // Section data states
  const [hardware, setHardware] = useState<HardwareData | null>(null);
  const [hardwareLoading, setHardwareLoading] = useState(false);

  const [software, setSoftware] = useState<NinjaSoftware[] | null>(null);
  const [softwareLoading, setSoftwareLoading] = useState(false);
  const [softwareSearch, setSoftwareSearch] = useState("");

  const [patches, setPatches] = useState<PatchData | null>(null);
  const [patchesLoading, setPatchesLoading] = useState(false);
  const [patchTab, setPatchTab] = useState<"os" | "software">("os");

  const [services, setServices] = useState<NinjaWindowsService[] | null>(null);
  const [servicesLoading, setServicesLoading] = useState(false);

  const [alerts, setAlerts] = useState<NinjaAlert[] | null>(null);
  const [alertsLoading, setAlertsLoading] = useState(false);

  // Assignment state
  const [assignment, setAssignment] = useState<{
    id: number;
    adUserUpn: string;
    adUserName: string;
    assignedAt: string;
    assignedBy: string;
  } | null>(null);
  const [linkedTenantId, setLinkedTenantId] = useState<number | null>(null);
  const [assignmentLoading, setAssignmentLoading] = useState(false);

  // Service control state: serviceId -> { loading, feedback, message }
  const [serviceControl, setServiceControl] = useState<
    Record<string, { loading: boolean; feedback: "success" | "error" | null; message?: string }>
  >({});

  const canControl = role === "ADMIN" || role === "EDITOR";

  const handleServiceControl = async (
    svcId: string,
    action: "START" | "STOP" | "RESTART",
  ) => {
    // Confirm destructive service actions
    if (action === "STOP" || action === "RESTART") {
      if (!window.confirm(`Are you sure you want to ${action.toLowerCase()} this service?`)) {
        return;
      }
    }
    setServiceControl((prev) => ({
      ...prev,
      [svcId]: { loading: true, feedback: null },
    }));
    try {
      const res = await fetch(
        `/api/ninja/devices/${deviceId}/services/${encodeURIComponent(svcId)}/control`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed" }));
        setServiceControl((prev) => ({
          ...prev,
          [svcId]: { loading: false, feedback: "error", message: data.error },
        }));
      } else {
        setServiceControl((prev) => ({
          ...prev,
          [svcId]: { loading: false, feedback: "success", message: action },
        }));
      }
    } catch {
      setServiceControl((prev) => ({
        ...prev,
        [svcId]: { loading: false, feedback: "error", message: "Network error" },
      }));
    }
    setTimeout(() => {
      setServiceControl((prev) => {
        const next = { ...prev };
        delete next[svcId];
        return next;
      });
    }, 2500);
  };

  // Open sections
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(
    new Set(["overview"]),
  );

  const toggleSection = (id: SectionKey) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Fetch device detail on mount
  useEffect(() => {
    setDeviceLoading(true);
    fetch(`/api/ninja/devices/${deviceId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch device");
        return res.json();
      })
      .then((data) => setDevice(data))
      .catch((err) =>
        setDeviceError(
          err instanceof Error ? err.message : "Failed to fetch device",
        ),
      )
      .finally(() => setDeviceLoading(false));
  }, [deviceId]);

  // Lazy-load section data when opened
  // Hardware data is shared by both "hardware" and "network" sections
  useEffect(() => {
    const needsHardware =
      (openSections.has("hardware") || openSections.has("network")) &&
      !hardware &&
      !hardwareLoading;
    if (needsHardware) {
      setHardwareLoading(true);
      fetch(`/api/ninja/devices/${deviceId}/hardware`)
        .then((res) => res.json())
        .then((data) => setHardware(data))
        .catch(() => setHardware({ processors: [], volumes: [], disks: [], networkInterfaces: [] }))
        .finally(() => setHardwareLoading(false));
    }
  }, [openSections, hardware, hardwareLoading, deviceId]);

  useEffect(() => {
    if (openSections.has("software") && !software && !softwareLoading) {
      setSoftwareLoading(true);
      fetch(`/api/ninja/devices/${deviceId}/software`)
        .then((res) => res.json())
        .then((data) => setSoftware(Array.isArray(data) ? data : []))
        .catch(() => setSoftware([]))
        .finally(() => setSoftwareLoading(false));
    }
  }, [openSections, software, softwareLoading, deviceId]);

  useEffect(() => {
    if (openSections.has("patches") && !patches && !patchesLoading) {
      setPatchesLoading(true);
      fetch(`/api/ninja/devices/${deviceId}/patches`)
        .then((res) => res.json())
        .then((data) => setPatches(data))
        .catch(() => setPatches({ osPatches: [], softwarePatches: [] }))
        .finally(() => setPatchesLoading(false));
    }
  }, [openSections, patches, patchesLoading, deviceId]);

  useEffect(() => {
    if (openSections.has("services") && !services && !servicesLoading) {
      setServicesLoading(true);
      fetch(`/api/ninja/devices/${deviceId}/services`)
        .then((res) => res.json())
        .then((data) => setServices(Array.isArray(data) ? data : []))
        .catch(() => setServices([]))
        .finally(() => setServicesLoading(false));
    }
  }, [openSections, services, servicesLoading, deviceId]);

  useEffect(() => {
    if (openSections.has("alerts") && !alerts && !alertsLoading) {
      setAlertsLoading(true);
      fetch(`/api/ninja/devices/${deviceId}/alerts`)
        .then((res) => res.json())
        .then((data) => setAlerts(Array.isArray(data) ? data : []))
        .catch(() => setAlerts([]))
        .finally(() => setAlertsLoading(false));
    }
  }, [openSections, alerts, alertsLoading, deviceId]);

  // Lazy-load assignment data when section is opened
  useEffect(() => {
    if (
      openSections.has("assignment") &&
      !assignment &&
      !assignmentLoading &&
      device
    ) {
      setAssignmentLoading(true);
      fetch(
        `/api/ninja/devices/${deviceId}/assignment?orgId=${device.organizationId}`,
      )
        .then((res) => res.json())
        .then((data) => {
          setLinkedTenantId(data.tenantId ?? null);
          setAssignment(data.assignment ?? null);
        })
        .catch(() => {
          setLinkedTenantId(null);
          setAssignment(null);
        })
        .finally(() => setAssignmentLoading(false));
    }
  }, [openSections, assignment, assignmentLoading, deviceId, device]);

  // Device loading state
  if (deviceLoading) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
        <span className="ml-2 text-sm text-[var(--text-secondary)]">
          Loading device...
        </span>
      </div>
    );
  }

  if (deviceError || !device) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8">
        <div className="flex items-start gap-3">
          <AlertTriangle
            className="w-5 h-5 mt-0.5 shrink-0"
            style={{ color: "var(--error)" }}
          />
          <div>
            <p className="text-sm font-medium text-[var(--error)]">
              Failed to load device
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {deviceError || "Device not found"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isOnline = device.offline === false;
  const deviceName =
    device.displayName || device.systemName || `Device #${device.id}`;

  // Filtered software list
  const filteredSoftware = software
    ? software.filter((s) => {
        if (!softwareSearch) return true;
        const term = softwareSearch.toLowerCase();
        return (
          (s.name || "").toLowerCase().includes(term) ||
          (s.publisher || "").toLowerCase().includes(term)
        );
      })
    : [];

  return (
    <div className="space-y-4">
      {/* Device header card */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
              <Monitor
                className="w-5 h-5"
                style={{ color: "var(--accent)" }}
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                {deviceName}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span
                  className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${nodeClassColor(device.nodeClass)}`}
                >
                  {nodeClassLabel(device.nodeClass)}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs">
                  {isOnline ? (
                    <>
                      <Wifi
                        className="w-3 h-3"
                        style={{ color: "var(--success)" }}
                      />
                      <span className="text-[var(--success)]">Online</span>
                    </>
                  ) : (
                    <>
                      <WifiOff
                        className="w-3 h-3"
                        style={{ color: "var(--error)" }}
                      />
                      <span className="text-[var(--error)]">Offline</span>
                    </>
                  )}
                </span>
                {device.maintenance?.status && (
                  <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--warning)]/10 text-[var(--warning)]">
                    Maintenance
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right text-xs text-[var(--text-muted)]">
            <p>Last contact: {formatNinjaTime(device.lastContact)}</p>
            {device.publicIP && <p className="mt-0.5">IP: {device.publicIP}</p>}
          </div>
        </div>
      </div>

      {/* Actions bar */}
      <NinjaDeviceActions
        deviceId={deviceId}
        role={role}
        maintenance={device.maintenance}
      />

      {/* --- OVERVIEW --- */}
      <Section
        id="overview"
        title="Overview"
        icon={<Monitor className="w-4 h-4" />}
        isOpen={openSections.has("overview")}
        onToggle={toggleSection}
      >
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoItem label="Display Name" value={device.displayName} />
          <InfoItem label="System Name" value={device.systemName} />
          <InfoItem label="DNS Name" value={device.dnsName} />
          <InfoItem
            label="Organization"
            value={device.references?.organization?.name || `Org #${device.organizationId}`}
          />
          <InfoItem
            label="Location"
            value={device.references?.location?.name}
          />
          <InfoItem label="Node Class" value={nodeClassLabel(device.nodeClass)} />
          <InfoItem
            label="Status"
            value={isOnline ? "Online" : "Offline"}
            valueColor={isOnline ? "var(--success)" : "var(--error)"}
          />
          <InfoItem label="Public IP" value={device.publicIP} />
          <InfoItem
            label="Last Contact"
            value={formatNinjaTime(device.lastContact)}
          />
          <InfoItem
            label="Approval"
            value={device.approvalStatus}
          />
          <InfoItem
            label="Maintenance"
            value={
              device.maintenance?.status
                ? `${device.maintenance.status}${device.maintenance.reasonMessage ? ` - ${device.maintenance.reasonMessage}` : ""}`
                : "None"
            }
          />
          {device.ipAddresses && device.ipAddresses.length > 0 && (
            <div className="sm:col-span-2 lg:col-span-3">
              <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
                IP Addresses
              </p>
              <div className="flex flex-wrap gap-1.5">
                {device.ipAddresses.map((ip, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                  >
                    {ip}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* --- HARDWARE --- */}
      <Section
        id="hardware"
        title="Hardware"
        icon={<Cpu className="w-4 h-4" />}
        isOpen={openSections.has("hardware")}
        onToggle={toggleSection}
      >
        {hardwareLoading ? (
          <SectionSkeleton />
        ) : hardware ? (
          <div className="p-4 space-y-6">
            {/* Processors */}
            {hardware.processors.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  Processors
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                          Architecture
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                          Cores
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                          Clock Speed
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {hardware.processors.map((p, i) => (
                        <tr
                          key={i}
                          className="border-b border-[var(--border)] last:border-b-0"
                        >
                          <td className="px-3 py-2 text-sm text-[var(--text-primary)]">
                            {p.name || "\u2014"}
                          </td>
                          <td className="px-3 py-2 text-sm text-[var(--text-secondary)]">
                            {p.architecture || "\u2014"}
                          </td>
                          <td className="px-3 py-2 text-sm text-[var(--text-secondary)]">
                            {p.numberOfCores ?? "\u2014"}
                            {p.numberOfLogicalProcessors
                              ? ` (${p.numberOfLogicalProcessors} logical)`
                              : ""}
                          </td>
                          <td className="px-3 py-2 text-sm text-[var(--text-secondary)]">
                            {p.maxClockSpeed
                              ? `${p.maxClockSpeed} MHz`
                              : "\u2014"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Volumes */}
            {hardware.volumes.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  Volumes
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                          Capacity
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                          Free Space
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider min-w-[200px]">
                          Usage
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {hardware.volumes.map((v, i) => {
                        const usedPercent =
                          v.capacity && v.freeSpace !== undefined
                            ? Math.round(
                                ((v.capacity - v.freeSpace) / v.capacity) * 100,
                              )
                            : null;
                        const barColor =
                          usedPercent !== null && usedPercent > 90
                            ? "var(--error)"
                            : usedPercent !== null && usedPercent > 75
                              ? "var(--warning)"
                              : "var(--accent)";

                        return (
                          <tr
                            key={i}
                            className="border-b border-[var(--border)] last:border-b-0"
                          >
                            <td className="px-3 py-2 text-sm text-[var(--text-primary)]">
                              {v.name || v.label || "\u2014"}
                            </td>
                            <td className="px-3 py-2 text-sm text-[var(--text-secondary)]">
                              {formatBytes(v.capacity)}
                            </td>
                            <td className="px-3 py-2 text-sm text-[var(--text-secondary)]">
                              {formatBytes(v.freeSpace)}
                            </td>
                            <td className="px-3 py-2">
                              {usedPercent !== null ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all"
                                      style={{
                                        width: `${usedPercent}%`,
                                        backgroundColor: barColor,
                                      }}
                                    />
                                  </div>
                                  <span className="text-xs text-[var(--text-muted)] w-10 text-right">
                                    {usedPercent}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-[var(--text-muted)]">
                                  {"\u2014"}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Disks */}
            {hardware.disks.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  Disks
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                          Model
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                          Interface
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                          Size
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {hardware.disks.map((d, i) => (
                        <tr
                          key={i}
                          className="border-b border-[var(--border)] last:border-b-0"
                        >
                          <td className="px-3 py-2 text-sm text-[var(--text-primary)]">
                            {d.model || "\u2014"}
                          </td>
                          <td className="px-3 py-2 text-sm text-[var(--text-secondary)]">
                            {d.interfaceType || "\u2014"}
                          </td>
                          <td className="px-3 py-2 text-sm text-[var(--text-secondary)]">
                            {formatBytes(d.size)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {hardware.processors.length === 0 &&
              hardware.volumes.length === 0 &&
              hardware.disks.length === 0 && (
                <p className="text-sm text-[var(--text-muted)] text-center py-4">
                  No hardware information available.
                </p>
              )}
          </div>
        ) : (
          <SectionSkeleton />
        )}
      </Section>

      {/* --- NETWORK --- */}
      <Section
        id="network"
        title="Network Interfaces"
        icon={<Network className="w-4 h-4" />}
        isOpen={openSections.has("network")}
        onToggle={toggleSection}
        badge={
          hardware?.networkInterfaces ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-hover)] text-[var(--text-muted)]">
              {hardware.networkInterfaces.length}
            </span>
          ) : undefined
        }
      >
        {hardwareLoading ? (
          <SectionSkeleton />
        ) : hardware?.networkInterfaces && hardware.networkInterfaces.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    MAC Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Speed
                  </th>
                </tr>
              </thead>
              <tbody>
                {hardware.networkInterfaces.map((ni, i) => (
                  <tr
                    key={i}
                    className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-[var(--text-primary)]">
                      {ni.adapterName || ni.name || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {ni.ipAddress || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)] font-mono text-xs">
                      {ni.macAddress || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {ni.speed ? `${ni.speed} Mbps` : "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-6 text-sm text-[var(--text-muted)] text-center">
            No network interface data available.
          </p>
        )}
      </Section>

      {/* --- SOFTWARE --- */}
      <Section
        id="software"
        title="Software"
        icon={<Package className="w-4 h-4" />}
        isOpen={openSections.has("software")}
        onToggle={toggleSection}
        badge={
          software ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-hover)] text-[var(--text-muted)]">
              {software.length}
            </span>
          ) : undefined
        }
      >
        {softwareLoading ? (
          <SectionSkeleton />
        ) : software ? (
          <div>
            {/* Search bar */}
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search software..."
                  value={softwareSearch}
                  onChange={(e) => setSoftwareSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-sm bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-[var(--bg-card)]">
                  <tr className="border-b border-[var(--border)]">
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Publisher
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Version
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Install Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSoftware.map((s, i) => (
                    <tr
                      key={i}
                      className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      <td className="px-4 py-2 text-sm text-[var(--text-primary)]">
                        {s.name || "\u2014"}
                      </td>
                      <td className="px-4 py-2 text-sm text-[var(--text-secondary)]">
                        {s.publisher || "\u2014"}
                      </td>
                      <td className="px-4 py-2 text-xs text-[var(--text-muted)] font-mono">
                        {s.version || "\u2014"}
                      </td>
                      <td className="px-4 py-2 text-xs text-[var(--text-muted)]">
                        {s.installDate || "\u2014"}
                      </td>
                    </tr>
                  ))}
                  {filteredSoftware.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-sm text-[var(--text-muted)]"
                      >
                        {software.length === 0
                          ? "No software data available."
                          : "No software matches your search."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <SectionSkeleton />
        )}
      </Section>

      {/* --- PATCHES --- */}
      <Section
        id="patches"
        title="Patches"
        icon={<Shield className="w-4 h-4" />}
        isOpen={openSections.has("patches")}
        onToggle={toggleSection}
      >
        {patchesLoading ? (
          <SectionSkeleton />
        ) : patches ? (
          <div>
            {/* Tabs */}
            <div className="flex border-b border-[var(--border)]">
              <button
                onClick={() => setPatchTab("os")}
                className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                  patchTab === "os"
                    ? "border-b-2 border-[var(--accent)] text-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                OS Patches ({patches.osPatches.length})
              </button>
              <button
                onClick={() => setPatchTab("software")}
                className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                  patchTab === "software"
                    ? "border-b-2 border-[var(--accent)] text-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                Software Patches ({patches.softwarePatches.length})
              </button>
            </div>

            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-[var(--bg-card)]">
                  <tr className="border-b border-[var(--border)]">
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      KB
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(patchTab === "os"
                    ? patches.osPatches
                    : patches.softwarePatches
                  ).map((p, i) => (
                    <tr
                      key={i}
                      className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      <td className="px-4 py-2 text-sm text-[var(--text-primary)]">
                        {p.name || "\u2014"}
                      </td>
                      <td className="px-4 py-2 text-xs text-[var(--text-muted)] font-mono">
                        {p.kbNumber || "\u2014"}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${severityBadge(p.severity)}`}
                        >
                          {p.severity || "Unknown"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-[var(--text-secondary)]">
                        {p.status || "\u2014"}
                      </td>
                      <td className="px-4 py-2 text-xs text-[var(--text-muted)]">
                        {p.type || "\u2014"}
                      </td>
                    </tr>
                  ))}
                  {(patchTab === "os"
                    ? patches.osPatches
                    : patches.softwarePatches
                  ).length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center text-sm text-[var(--text-muted)]"
                      >
                        No {patchTab === "os" ? "OS" : "software"} patches found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <SectionSkeleton />
        )}
      </Section>

      {/* --- SERVICES --- */}
      <Section
        id="services"
        title="Windows Services"
        icon={<Settings className="w-4 h-4" />}
        isOpen={openSections.has("services")}
        onToggle={toggleSection}
        badge={
          services ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-hover)] text-[var(--text-muted)]">
              {services.length}
            </span>
          ) : undefined
        }
      >
        {servicesLoading ? (
          <SectionSkeleton />
        ) : services && services.length > 0 ? (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-[var(--bg-card)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Display Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    State
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Start Type
                  </th>
                  {canControl && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {services.map((s, i) => {
                  const svcId = s.serviceName || s.serviceId || `svc-${i}`;
                  const ctrl = serviceControl[svcId];
                  return (
                    <tr
                      key={i}
                      className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      <td className="px-4 py-2 text-sm text-[var(--text-primary)]">
                        {s.displayName || s.serviceName || "\u2014"}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${serviceStateBadge(s.state)}`}
                        >
                          {s.state || "Unknown"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-[var(--text-muted)]">
                        {s.startType || "\u2014"}
                      </td>
                      {canControl && (
                        <td className="px-4 py-2">
                          {ctrl?.loading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
                          ) : ctrl?.feedback ? (
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                                ctrl.feedback === "success"
                                  ? "text-[var(--success)]"
                                  : "text-[var(--error)]"
                              }`}
                            >
                              {ctrl.feedback === "success" ? (
                                <CheckCircle className="w-3 h-3" />
                              ) : (
                                <XCircle className="w-3 h-3" />
                              )}
                              {ctrl.feedback === "success" ? ctrl.message : "Failed"}
                            </span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleServiceControl(svcId, "START")}
                                title="Start"
                                className="p-1 rounded hover:bg-[var(--success)]/10 text-[var(--text-muted)] hover:text-[var(--success)] transition-colors"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleServiceControl(svcId, "STOP")}
                                title="Stop"
                                className="p-1 rounded hover:bg-[var(--error)]/10 text-[var(--text-muted)] hover:text-[var(--error)] transition-colors"
                              >
                                <Square className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleServiceControl(svcId, "RESTART")}
                                title="Restart"
                                className="p-1 rounded hover:bg-[var(--warning)]/10 text-[var(--text-muted)] hover:text-[var(--warning)] transition-colors"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : services && services.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--text-muted)] text-center">
            No Windows services data available.
          </p>
        ) : (
          <SectionSkeleton />
        )}
      </Section>

      {/* --- ALERTS --- */}
      <Section
        id="alerts"
        title="Alerts"
        icon={<Bell className="w-4 h-4" />}
        isOpen={openSections.has("alerts")}
        onToggle={toggleSection}
        badge={
          alerts && alerts.length > 0 ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--error)]/10 text-[var(--error)]">
              {alerts.length}
            </span>
          ) : undefined
        }
      >
        {alertsLoading ? (
          <SectionSkeleton />
        ) : alerts && alerts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a, i) => (
                  <tr
                    key={a.uid || i}
                    className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <td className="px-4 py-2 text-sm text-[var(--text-primary)] max-w-md">
                      {a.message || a.subject || "\u2014"}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs font-medium ${severityColor(a.severity)}`}>
                        {a.severity || "Unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-[var(--text-muted)]">
                      {a.sourceName || a.sourceType || "\u2014"}
                    </td>
                    <td className="px-4 py-2 text-xs text-[var(--text-muted)]">
                      {formatNinjaTime(a.createTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : alerts && alerts.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--text-muted)] text-center">
            No active alerts for this device.
          </p>
        ) : (
          <SectionSkeleton />
        )}
      </Section>

      {/* --- ASSIGNMENT --- */}
      <Section
        id="assignment"
        title="Assignment"
        icon={<Users className="w-4 h-4" />}
        isOpen={openSections.has("assignment")}
        onToggle={toggleSection}
        badge={
          assignment ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
              Assigned
            </span>
          ) : undefined
        }
      >
        {assignmentLoading ? (
          <SectionSkeleton />
        ) : (
          <NinjaDeviceAssignment
            deviceId={deviceId}
            organizationId={device.organizationId}
            tenantId={linkedTenantId}
            role={role}
            currentAssignment={assignment}
          />
        )}
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Info item sub-component
// ---------------------------------------------------------------------------

function InfoItem({
  label,
  value,
  valueColor,
}: {
  label: string;
  value?: string | null;
  valueColor?: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p
        className="text-sm text-[var(--text-primary)]"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value || "\u2014"}
      </p>
    </div>
  );
}
