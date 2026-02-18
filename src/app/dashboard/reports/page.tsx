import { getSessionRole } from "@/lib/rbac";
import { ReportSelector } from "@/components/report-selector";
import { FileBarChart } from "lucide-react";

export default async function ReportsPage() {
  const role = await getSessionRole();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Reports
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Generate and export reports across all tenants
          </p>
        </div>
        <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
          <FileBarChart className="w-5 h-5" style={{ color: "var(--accent)" }} />
        </div>
      </div>

      {role === "VIEWER" && (
        <div className="bg-[var(--warning)]/10 border border-[var(--warning)]/20 rounded-xl px-4 py-3 text-sm text-[var(--warning)] mb-6">
          You have read-only access. Report data is live and may take a moment to load.
        </div>
      )}

      <ReportSelector />
    </div>
  );
}
