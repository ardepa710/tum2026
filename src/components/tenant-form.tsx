"use client";

import { useActionState } from "react";
import { createTenant } from "@/app/dashboard/tenants/new/actions";
import {
  Building2,
  Globe,
  KeyRound,
  Shield,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { useState } from "react";

export function TenantForm() {
  const [state, formAction, isPending] = useActionState(createTenant, {
    error: null,
  });
  const [showSecret, setShowSecret] = useState(false);

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-lg p-4">
          <p className="text-sm text-[var(--error)]">{state.error}</p>
        </div>
      )}

      {/* Tenant Name */}
      <div>
        <label
          htmlFor="name"
          className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2"
        >
          <Building2 className="w-4 h-4 text-[var(--text-muted)]" />
          Tenant Name <span className="text-[var(--error)]">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="e.g. Contoso Ltd"
          className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
        />
      </div>

      {/* Domain */}
      <div>
        <label
          htmlFor="domain"
          className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2"
        >
          <Globe className="w-4 h-4 text-[var(--text-muted)]" />
          Domain
        </label>
        <input
          id="domain"
          name="domain"
          type="text"
          placeholder="e.g. contoso.onmicrosoft.com"
          className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
        />
      </div>

      {/* Divider */}
      <div className="border-t border-[var(--border)] pt-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
          Azure AD Configuration
        </h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Optional. Configure these to enable user, group, and license
          management via Microsoft Graph API.
        </p>
      </div>

      {/* Azure Tenant ID */}
      <div>
        <label
          htmlFor="azureTenantId"
          className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2"
        >
          <KeyRound className="w-4 h-4 text-[var(--text-muted)]" />
          Azure Tenant ID
        </label>
        <input
          id="azureTenantId"
          name="azureTenantId"
          type="text"
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors font-mono"
        />
      </div>

      {/* Azure Client ID */}
      <div>
        <label
          htmlFor="azureClientId"
          className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2"
        >
          <Shield className="w-4 h-4 text-[var(--text-muted)]" />
          Azure Client ID
        </label>
        <input
          id="azureClientId"
          name="azureClientId"
          type="text"
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors font-mono"
        />
      </div>

      {/* Azure Client Secret */}
      <div>
        <label
          htmlFor="azureClientSecret"
          className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2"
        >
          <KeyRound className="w-4 h-4 text-[var(--text-muted)]" />
          Azure Client Secret
        </label>
        <div className="relative">
          <input
            id="azureClientSecret"
            name="azureClientSecret"
            type={showSecret ? "text" : "password"}
            placeholder="Client secret value"
            className="w-full px-4 py-2.5 pr-12 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors font-mono"
          />
          <button
            type="button"
            onClick={() => setShowSecret(!showSecret)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            {showSecret ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {isPending ? "Creating..." : "Create Tenant"}
        </button>
      </div>
    </form>
  );
}
