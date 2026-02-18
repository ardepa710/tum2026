"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export function AlertBanner() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then((alerts) => {
        const urgent = alerts.filter(
          (a: { severity: string }) =>
            a.severity === "error" || a.severity === "warning"
        );
        setCount(urgent.length);
      })
      .catch(() => {});
  }, []);

  if (count === 0) return null;

  return (
    <div className="mb-6 px-4 py-3 bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded-xl flex items-center gap-3">
      <AlertTriangle className="w-5 h-5 text-[var(--warning)] shrink-0" />
      <p className="text-sm text-[var(--text-primary)] flex-1">
        <strong>{count}</strong> alert{count !== 1 ? "s" : ""} require
        attention
      </p>
      <Link
        href="/dashboard/alerts"
        className="text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
      >
        View alerts
      </Link>
    </div>
  );
}
