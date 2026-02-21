import { requireRole } from "@/lib/rbac";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { NinjaDeviceDetail } from "@/components/ninja-device-detail";

export default async function RmmDeviceDetailPage({
  params,
}: {
  params: Promise<{ deviceId: string }>;
}) {
  const role = await requireRole("VIEWER");

  const { deviceId: raw } = await params;
  const deviceId = Number(raw);
  if (isNaN(deviceId)) notFound();

  return (
    <div>
      {/* Back link */}
      <Link
        href="/dashboard/rmm/devices"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Devices
      </Link>

      {/* Device detail (client component) */}
      <NinjaDeviceDetail deviceId={deviceId} role={role} />
    </div>
  );
}
