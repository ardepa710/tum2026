"use client";

import { useActionState } from "react";
import { Building2, X, Plus } from "lucide-react";
import {
  assignTenantToTechnician,
  removeTenantFromTechnician,
} from "@/app/dashboard/technicians/actions";

type Tenant = { id: number; tenantName: string; tenantAbbrv: string };

type Assignment = {
  id: number;
  tenantId: number;
  tenant: { tenantName: string; tenantAbbrv: string };
  assignedBy: string;
};

type Props = {
  technicianId: number;
  techEmail: string;
  assignments: Assignment[];
  availableTenants: Tenant[];
};

export function TechTenantManager({
  technicianId,
  techEmail,
  assignments,
  availableTenants,
}: Props) {
  const [addState, addAction, addPending] = useActionState(
    assignTenantToTechnician,
    { error: "" }
  );

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-5 h-5" style={{ color: "var(--accent)" }} />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Tenant Access
        </h3>
        <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-hover)] px-1.5 py-0.5 rounded-full">
          {assignments.length}
        </span>
      </div>

      {/* Assigned tenants list */}
      {assignments.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] mb-3">
          No tenants assigned. This technician cannot access any tenant data
          until at least one is assigned.
        </p>
      ) : (
        <div className="space-y-1.5 mb-3">
          {assignments.map((a) => {
            // Bind the assignment ID and technician ID so the form action receives them
            const removeAction = removeTenantFromTechnician.bind(
              null,
              a.id,
              technicianId
            );
            return (
              <div
                key={a.id}
                className="flex items-center justify-between px-3 py-2 bg-[var(--bg-primary)] rounded-lg"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono font-semibold text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.5 rounded shrink-0">
                    {a.tenant.tenantAbbrv}
                  </span>
                  <span className="text-sm text-[var(--text-primary)] truncate">
                    {a.tenant.tenantName}
                  </span>
                </div>
                <div className="flex items-center gap-3 ml-3 shrink-0">
                  <span className="text-xs text-[var(--text-muted)] hidden sm:block">
                    by {a.assignedBy.split("@")[0]}
                  </span>
                  <form action={removeAction}>
                    <button
                      type="submit"
                      title={`Remove access to ${a.tenant.tenantName}`}
                      className="p-1 rounded hover:bg-[var(--error)]/10 text-[var(--text-muted)] hover:text-[var(--error)] transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add tenant form */}
      {availableTenants.length > 0 && (
        <form action={addAction} className="flex items-center gap-2">
          <input type="hidden" name="techEmail" value={techEmail} />
          <select
            name="tenantId"
            defaultValue=""
            required
            className="flex-1 h-8 text-xs bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-2 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
          >
            <option value="" disabled>
              Add tenant…
            </option>
            {availableTenants.map((t) => (
              <option key={t.id} value={t.id}>
                [{t.tenantAbbrv}] {t.tenantName}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={addPending}
            className="inline-flex items-center gap-1 px-3 h-8 text-xs font-medium bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            <Plus className="w-3 h-3" />
            {addPending ? "Adding…" : "Add"}
          </button>
        </form>
      )}

      {addState.error && (
        <p className="text-xs text-[var(--error)] mt-2">{addState.error}</p>
      )}

      {availableTenants.length === 0 && assignments.length > 0 && (
        <p className="text-xs text-[var(--text-muted)] mt-2">
          All tenants are already assigned.
        </p>
      )}
    </div>
  );
}
