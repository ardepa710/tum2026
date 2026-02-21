"use client";

import { useState, useEffect, useRef } from "react";
import {
  Monitor,
  Search,
  Loader2,
  Info,
  ChevronDown,
  Calendar,
  User,
  UserMinus,
  Plus,
} from "lucide-react";
import Link from "next/link";
import {
  assignDeviceToUser,
  unassignDevice,
} from "@/app/dashboard/rmm/devices/actions";
import { nodeClassLabel } from "@/lib/ninja-utils";
import type { NinjaDevice } from "@/lib/types/ninja";

interface AssignmentItem {
  id: number;
  ninjaDeviceId: number;
  ninjaDeviceName: string;
  assignedAt: string;
  assignedBy: string;
}

interface UserDeviceSectionProps {
  tenantId: string;
  userUpn: string;
  userName: string;
  role: string;
}

export function UserDeviceSection({
  tenantId,
  userUpn,
  userName,
  role,
}: UserDeviceSectionProps) {
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [ninjaOrgId, setNinjaOrgId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [devices, setDevices] = useState<NinjaDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [unassigningId, setUnassigningId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const canEdit = role === "ADMIN" || role === "EDITOR";

  // Fetch assignments on mount
  useEffect(() => {
    fetchAssignments();
  }, [tenantId, userUpn]);

  async function fetchAssignments() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/tenants/${tenantId}/device-assignments?upn=${encodeURIComponent(userUpn)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setNinjaOrgId(data.ninjaOrgId ?? null);
      setAssignments(data.assignments ?? []);
    } catch {
      setNinjaOrgId(null);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  // Focus search when dropdown opens
  useEffect(() => {
    if (showDropdown && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showDropdown]);

  // Clear feedback after 3s
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Open device picker
  const handleOpenDropdown = async () => {
    setShowDropdown(true);
    setSearchTerm("");

    if (devices.length === 0 && ninjaOrgId) {
      setDevicesLoading(true);
      try {
        const res = await fetch(
          `/api/ninja/organizations/${ninjaOrgId}/devices`,
        );
        if (!res.ok) throw new Error("Failed to fetch devices");
        const data = await res.json();
        setDevices(Array.isArray(data) ? data : []);
      } catch {
        setDevices([]);
      } finally {
        setDevicesLoading(false);
      }
    }
  };

  // Assign device to user
  const handleAssign = async (device: NinjaDevice) => {
    setAssigning(true);
    setShowDropdown(false);

    const deviceName =
      device.displayName || device.systemName || `Device #${device.id}`;
    const result = await assignDeviceToUser(
      Number(tenantId),
      device.id,
      deviceName,
      userUpn,
      userName,
    );

    if (result.success) {
      setFeedback({ type: "success", message: `${deviceName} assigned` });
      await fetchAssignments();
    } else {
      setFeedback({ type: "error", message: result.error });
    }

    setAssigning(false);
  };

  // Unassign device
  const handleUnassign = async (assignment: AssignmentItem) => {
    if (
      !window.confirm(
        `Unassign ${assignment.ninjaDeviceName} from this user?`,
      )
    )
      return;

    setUnassigningId(assignment.id);

    const result = await unassignDevice(assignment.id);

    if (result.success) {
      setAssignments((prev) => prev.filter((a) => a.id !== assignment.id));
      setFeedback({
        type: "success",
        message: `${assignment.ninjaDeviceName} unassigned`,
      });
    } else {
      setFeedback({ type: "error", message: result.error });
    }

    setUnassigningId(null);
  };

  // Filter devices by search
  const assignedDeviceIds = new Set(assignments.map((a) => a.ninjaDeviceId));
  const filteredDevices = devices.filter((d) => {
    if (assignedDeviceIds.has(d.id)) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const name = (d.displayName || d.systemName || "").toLowerCase();
    return name.includes(term);
  });

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
        <span className="ml-2 text-xs text-[var(--text-secondary)]">
          Loading devices...
        </span>
      </div>
    );
  }

  // Tenant not linked
  if (ninjaOrgId === null) {
    return (
      <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--accent)]/5 border border-[var(--accent)]/20">
        <Info
          className="w-4 h-4 mt-0.5 shrink-0"
          style={{ color: "var(--accent)" }}
        />
        <p className="text-sm text-[var(--text-secondary)]">
          This tenant is not linked to a NinjaOne organization. Link it in{" "}
          <Link
            href="/dashboard/rmm/settings"
            className="text-[var(--accent)] hover:underline"
          >
            RMM Settings
          </Link>{" "}
          to enable device assignment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Feedback */}
      {feedback && (
        <div
          className={`text-xs font-medium px-3 py-2 rounded-lg ${
            feedback.type === "success"
              ? "bg-[var(--success)]/10 text-[var(--success)]"
              : "bg-[var(--error)]/10 text-[var(--error)]"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Assigned devices list */}
      {assignments.length > 0 ? (
        <div className="space-y-2">
          {assignments.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
                  <Monitor
                    className="w-4 h-4"
                    style={{ color: "var(--accent)" }}
                  />
                </div>
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/rmm/devices/${a.ninjaDeviceId}`}
                    className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent)] truncate block"
                  >
                    {a.ninjaDeviceName}
                  </Link>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[var(--text-muted)] inline-flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      {new Date(a.assignedAt).toLocaleDateString()}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] inline-flex items-center gap-1">
                      <User className="w-2.5 h-2.5" />
                      {a.assignedBy}
                    </span>
                  </div>
                </div>
              </div>

              {canEdit && (
                <button
                  onClick={() => handleUnassign(a)}
                  disabled={unassigningId === a.id}
                  className="p-1.5 rounded-lg text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors disabled:opacity-50 shrink-0"
                  title="Unassign device"
                >
                  {unassigningId === a.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserMinus className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--text-muted)] py-1">
          No devices assigned
        </p>
      )}

      {/* Assign button + dropdown */}
      {canEdit && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={handleOpenDropdown}
            disabled={assigning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent)]/80 transition-colors disabled:opacity-50"
          >
            {assigning ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Plus className="w-3 h-3" />
            )}
            Assign Device
            <ChevronDown className="w-3 h-3" />
          </button>

          {showDropdown && (
            <div className="absolute left-0 bottom-full mb-1 w-80 max-h-64 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg z-50 overflow-hidden flex flex-col">
              {/* Search */}
              <div className="p-2 border-b border-[var(--border)]">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search devices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                </div>
              </div>

              {/* Device list */}
              <div className="overflow-y-auto flex-1">
                {devicesLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
                    <span className="ml-2 text-xs text-[var(--text-secondary)]">
                      Loading devices...
                    </span>
                  </div>
                ) : filteredDevices.length === 0 ? (
                  <div className="px-3 py-4 text-center">
                    <p className="text-xs text-[var(--text-muted)]">
                      {devices.length === 0
                        ? "No devices found in this organization"
                        : "No devices match your search"}
                    </p>
                  </div>
                ) : (
                  filteredDevices.map((device) => (
                    <button
                      key={device.id}
                      onClick={() => handleAssign(device)}
                      className="w-full flex items-start gap-2.5 px-3 py-2 hover:bg-[var(--bg-hover)] transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Monitor
                          className="w-3.5 h-3.5"
                          style={{ color: "var(--accent)" }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {device.displayName ||
                            device.systemName ||
                            `Device #${device.id}`}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {nodeClassLabel(device.nodeClass)}
                          {device.offline === false ? " · Online" : ""}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
