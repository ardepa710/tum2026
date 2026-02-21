import { requireRole } from "@/lib/rbac";
import { Monitor } from "lucide-react";
import { NinjaDeviceTable } from "@/components/ninja-device-table";

export default async function RmmDevicesPage() {
  await requireRole("VIEWER");

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Devices
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            All NinjaOne managed devices across organizations
          </p>
        </div>
        <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
          <Monitor className="w-5 h-5" style={{ color: "var(--accent)" }} />
        </div>
      </div>

      {/* Device table (client component) */}
      <NinjaDeviceTable />
    </div>
  );
}
