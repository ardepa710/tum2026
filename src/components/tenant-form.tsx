"use client";

import { useActionState } from "react";
import { createTenant, updateTenant } from "@/app/dashboard/tenants/new/actions";
import {
  Building2,
  Hash,
  KeyRound,
  Globe,
  Loader2,
} from "lucide-react";

type TenantData = {
  id: number;
  tenantName: string;
  tenantAbbrv: string;
  tenantIdRewst: string;
  tenantIdMsft: string;
  domainUrl: string | null;
} | null;

export function TenantForm({ tenant }: { tenant?: TenantData }) {
  const isEdit = !!tenant;
  const action = isEdit ? updateTenant : createTenant;
  const [state, formAction, isPending] = useActionState(action, {
    error: "",
  });

  const inputClass =
    "w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors";

  return (
    <form action={formAction} className="space-y-5">
      {isEdit && <input type="hidden" name="id" value={tenant.id} />}

      {state.error !== "" && (
        <div className="bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-lg p-4">
          <p className="text-sm text-[var(--error)]">{state.error}</p>
        </div>
      )}

      {/* Tenant Name */}
      <div>
        <label
          htmlFor="tenantName"
          className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2"
        >
          <Building2 className="w-4 h-4 text-[var(--text-muted)]" />
          Tenant Name <span className="text-[var(--error)]">*</span>
        </label>
        <input
          id="tenantName"
          name="tenantName"
          type="text"
          required
          defaultValue={tenant?.tenantName ?? ""}
          placeholder="e.g. Contoso Ltd"
          className={inputClass}
        />
      </div>

      {/* Tenant Abbreviation */}
      <div>
        <label
          htmlFor="tenantAbbrv"
          className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2"
        >
          <Hash className="w-4 h-4 text-[var(--text-muted)]" />
          Abbreviation <span className="text-[var(--error)]">*</span>
        </label>
        <input
          id="tenantAbbrv"
          name="tenantAbbrv"
          type="text"
          required
          defaultValue={tenant?.tenantAbbrv ?? ""}
          placeholder="e.g. CNTS"
          className={inputClass}
        />
      </div>

      {/* Domain URL */}
      <div>
        <label
          htmlFor="domainUrl"
          className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2"
        >
          <Globe className="w-4 h-4 text-[var(--text-muted)]" />
          Domain URL
        </label>
        <input
          id="domainUrl"
          name="domainUrl"
          type="url"
          defaultValue={tenant?.domainUrl ?? ""}
          placeholder="e.g. https://contoso.com"
          className={inputClass}
        />
      </div>

      {/* Divider */}
      <div className="border-t border-[var(--border)] pt-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
          Platform IDs
        </h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Required identifiers for Rewst and Microsoft integrations.
        </p>
      </div>

      {/* Rewst Tenant ID */}
      <div>
        <label
          htmlFor="tenantIdRewst"
          className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2"
        >
          <KeyRound className="w-4 h-4 text-[var(--text-muted)]" />
          Rewst Tenant ID <span className="text-[var(--error)]">*</span>
        </label>
        <input
          id="tenantIdRewst"
          name="tenantIdRewst"
          type="text"
          required
          defaultValue={tenant?.tenantIdRewst ?? ""}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          className={`${inputClass} font-mono`}
        />
      </div>

      {/* Microsoft Tenant ID */}
      <div>
        <label
          htmlFor="tenantIdMsft"
          className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2"
        >
          <KeyRound className="w-4 h-4 text-[var(--text-muted)]" />
          Microsoft Tenant ID <span className="text-[var(--error)]">*</span>
        </label>
        <input
          id="tenantIdMsft"
          name="tenantIdMsft"
          type="text"
          required
          defaultValue={tenant?.tenantIdMsft ?? ""}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          className={`${inputClass} font-mono`}
        />
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {isPending
            ? isEdit
              ? "Saving..."
              : "Creating..."
            : isEdit
              ? "Save Changes"
              : "Create Tenant"}
        </button>
      </div>
    </form>
  );
}
