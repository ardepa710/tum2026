import { HeartPulse } from "lucide-react";
import { ServiceHealth } from "@/components/service-health";

export default function ServiceHealthPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Service Health
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            M365 service status across all tenants
          </p>
        </div>
        <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
          <HeartPulse className="w-5 h-5" style={{ color: "var(--accent)" }} />
        </div>
      </div>
      <ServiceHealth />
    </div>
  );
}
