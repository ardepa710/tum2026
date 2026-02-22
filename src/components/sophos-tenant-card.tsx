"use client";

import { sophosCheckColor } from "@/lib/sophos-utils";
import type { SophosHealthCheck } from "@/lib/types/sophos";
import { Shield, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface Props {
  tenantName: string;
  tenantAbbrv: string;
  sophosRegion: string | null;
  healthCheck: SophosHealthCheck | null;
}

export function SophosTenantCard({ tenantName, tenantAbbrv, sophosRegion, healthCheck }: Props) {
  const checks = [
    { label: "Protection", result: healthCheck?.endpoint?.protection },
    { label: "Policy", result: healthCheck?.endpoint?.policy },
    { label: "Exclusions", result: healthCheck?.endpoint?.exclusions },
    { label: "Tamper", result: healthCheck?.endpoint?.tamperProtection },
  ];

  const statusIcon = (status?: string) => {
    switch (status) {
      case "green": return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "amber": return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case "red": return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <Shield className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">{tenantName}</h3>
          <p className="text-sm text-[var(--text-secondary)]">{tenantAbbrv}</p>
        </div>
        {sophosRegion && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400">
            {sophosRegion}
          </span>
        )}
      </div>

      <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Account Health Check</h4>
      
      {!healthCheck ? (
        <p className="text-sm text-[var(--text-secondary)]">Health check data unavailable</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {checks.map((check) => (
            <div
              key={check.label}
              className={`flex items-center gap-2 p-3 rounded-lg ${sophosCheckColor(check.result?.status)}`}
            >
              {statusIcon(check.result?.status)}
              <div>
                <p className="text-xs font-medium">{check.label}</p>
                {check.result?.summary && (
                  <p className="text-xs opacity-75 mt-0.5">{check.result.summary}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
