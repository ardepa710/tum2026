"use client";

import { useState, useEffect, useRef } from "react";
import {
  User,
  UserMinus,
  Search,
  Loader2,
  Link as LinkIcon,
  Info,
  ChevronDown,
  Calendar,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import {
  assignDeviceToUser,
  unassignDevice,
} from "@/app/dashboard/rmm/devices/actions";

interface ADUser {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
  accountEnabled: boolean;
  jobTitle: string;
  department: string;
}

interface AssignmentData {
  id: number;
  adUserUpn: string;
  adUserName: string;
  assignedAt: string;
  assignedBy: string;
}

interface NinjaDeviceAssignmentProps {
  deviceId: number;
  deviceName: string;
  organizationId: number;
  tenantId: number | null;
  role: string;
  currentAssignment: AssignmentData | null;
  onAssignmentChange?: (assignment: AssignmentData | null) => void;
}

export function NinjaDeviceAssignment({
  deviceId,
  deviceName,
  organizationId,
  tenantId,
  role,
  currentAssignment,
  onAssignmentChange,
}: NinjaDeviceAssignmentProps) {
  const [assignment, setAssignment] = useState<AssignmentData | null>(
    currentAssignment,
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const [adUsers, setAdUsers] = useState<ADUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [unassigning, setUnassigning] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const canEdit = role === "ADMIN" || role === "EDITOR";

  // Sync prop changes
  useEffect(() => {
    setAssignment(currentAssignment);
  }, [currentAssignment]);

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

  // Focus search input when dropdown opens
  useEffect(() => {
    if (showDropdown && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showDropdown]);

  // Clear feedback after 3 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Fetch AD users when dropdown opens
  const handleOpenDropdown = async () => {
    setShowDropdown(true);
    setSearchTerm("");

    if (adUsers.length === 0 && tenantId) {
      setUsersLoading(true);
      setUsersError(null);
      try {
        const res = await fetch(`/api/tenants/${tenantId}/users`);
        if (!res.ok) {
          throw new Error("Failed to fetch users");
        }
        const data = await res.json();
        setAdUsers(Array.isArray(data) ? data : []);
      } catch {
        setUsersError("Failed to load AD users");
      } finally {
        setUsersLoading(false);
      }
    }
  };

  // Assign user to device
  const handleAssign = async (user: ADUser) => {
    if (!tenantId) return;
    setAssigning(true);
    setShowDropdown(false);

    const result = await assignDeviceToUser(
      tenantId,
      deviceId,
      deviceName,
      user.userPrincipalName,
      user.displayName,
    );

    if (result.success) {
      const newAssignment = {
        id: result.assignment.id,
        adUserUpn: result.assignment.adUserUpn,
        adUserName: result.assignment.adUserName,
        assignedAt: new Date(result.assignment.assignedAt).toISOString(),
        assignedBy: result.assignment.assignedBy,
      };
      setAssignment(newAssignment);
      onAssignmentChange?.(newAssignment);
      setFeedback({ type: "success", message: "User assigned successfully" });
    } else {
      setFeedback({ type: "error", message: result.error });
    }

    setAssigning(false);
  };

  // Unassign user from device
  const handleUnassign = async () => {
    if (!assignment) return;
    if (!window.confirm("Are you sure you want to unassign this user?")) return;

    setUnassigning(true);

    const result = await unassignDevice(assignment.id);

    if (result.success) {
      setAssignment(null);
      onAssignmentChange?.(null);
      setFeedback({ type: "success", message: "User unassigned successfully" });
    } else {
      setFeedback({ type: "error", message: result.error });
    }

    setUnassigning(false);
  };

  // Filter users by search term
  const filteredUsers = adUsers.filter((u) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(term) ||
      u.userPrincipalName.toLowerCase().includes(term)
    );
  });

  // --- If org not linked to any tenant ---
  if (tenantId === null) {
    return (
      <div className="px-4 py-5">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--accent)]/5 border border-[var(--accent)]/20">
          <Info
            className="w-4 h-4 mt-0.5 shrink-0"
            style={{ color: "var(--accent)" }}
          />
          <div>
            <p className="text-sm text-[var(--text-primary)]">
              Organization not linked to any Microsoft tenant. Link it in RMM
              Settings to enable device assignment.
            </p>
            <Link
              href="/dashboard/rmm/settings"
              className="inline-flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline mt-2"
            >
              <LinkIcon className="w-3 h-3" />
              Go to RMM Settings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-3">
      {/* Feedback message */}
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

      {/* Current assignment display */}
      {assignment ? (
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
              <UserCheck
                className="w-4 h-4"
                style={{ color: "var(--accent)" }}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {assignment.adUserName}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {assignment.adUserUpn}
              </p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                  <Calendar className="w-3 h-3" />
                  {new Date(assignment.assignedAt).toLocaleDateString()}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                  <User className="w-3 h-3" />
                  {assignment.assignedBy}
                </span>
              </div>
            </div>
          </div>

          {canEdit && (
            <button
              onClick={handleUnassign}
              disabled={unassigning}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--error)]/10 text-[var(--error)] hover:bg-[var(--error)]/20 transition-colors disabled:opacity-50"
            >
              {unassigning ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <UserMinus className="w-3 h-3" />
              )}
              Unassign
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--bg-hover)] flex items-center justify-center shrink-0">
            <User
              className="w-4 h-4"
              style={{ color: "var(--text-muted)" }}
            />
          </div>
          <p className="text-sm text-[var(--text-muted)]">No user assigned</p>
        </div>
      )}

      {/* Assign User button + dropdown (editors/admins only) */}
      {canEdit && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={handleOpenDropdown}
            disabled={assigning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent)]/80 transition-colors disabled:opacity-50"
          >
            {assigning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <User className="w-3.5 h-3.5" />
            )}
            {assignment ? "Reassign User" : "Assign User"}
            <ChevronDown className="w-3 h-3" />
          </button>

          {showDropdown && (
            <div className="absolute left-0 top-full mt-1 w-80 max-h-72 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg z-50 overflow-hidden flex flex-col">
              {/* Search input */}
              <div className="p-2 border-b border-[var(--border)]">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                </div>
              </div>

              {/* User list */}
              <div className="overflow-y-auto flex-1">
                {usersLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
                    <span className="ml-2 text-xs text-[var(--text-secondary)]">
                      Loading users...
                    </span>
                  </div>
                ) : usersError ? (
                  <div className="px-3 py-4 text-center">
                    <p className="text-xs text-[var(--error)]">{usersError}</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="px-3 py-4 text-center">
                    <p className="text-xs text-[var(--text-muted)]">
                      {adUsers.length === 0
                        ? "No AD users found"
                        : "No users match your search"}
                    </p>
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleAssign(user)}
                      className="w-full flex items-start gap-2.5 px-3 py-2 hover:bg-[var(--bg-hover)] transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-full bg-[var(--accent)]/10 flex items-center justify-center shrink-0 mt-0.5">
                        <User
                          className="w-3.5 h-3.5"
                          style={{ color: "var(--accent)" }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {user.displayName}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          {user.userPrincipalName}
                        </p>
                      </div>
                      {!user.accountEnabled && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--error)]/10 text-[var(--error)] shrink-0">
                          Disabled
                        </span>
                      )}
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
