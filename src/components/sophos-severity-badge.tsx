"use client";

import { sophosSeverityColor, sophosSeverityLabel } from "@/lib/sophos-utils";

export function SophosSeverityBadge({ severity }: { severity?: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sophosSeverityColor(severity)}`}
    >
      {sophosSeverityLabel(severity)}
    </span>
  );
}
