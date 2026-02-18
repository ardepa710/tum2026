"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UsersRound,
  KeyRound,
  ListTodo,
  ShieldCheck,
} from "lucide-react";

interface TenantTabsProps {
  tenantId: string;
}

const tabs = [
  { label: "Overview", segment: "", icon: LayoutDashboard },
  { label: "Users", segment: "/users", icon: Users },
  { label: "Groups", segment: "/groups", icon: UsersRound },
  { label: "Licenses", segment: "/licenses", icon: KeyRound },
  { label: "Tasks", segment: "/tasks", icon: ListTodo },
  { label: "Policies", segment: "/policies", icon: ShieldCheck },
];

export function TenantTabs({ tenantId }: TenantTabsProps) {
  const pathname = usePathname();
  const basePath = `/dashboard/tenants/${tenantId}`;

  return (
    <nav className="flex items-center gap-1 border-b border-[var(--border)] mb-6 overflow-x-auto">
      {tabs.map((tab) => {
        const href = `${basePath}${tab.segment}`;
        const isActive =
          tab.segment === ""
            ? pathname === basePath
            : pathname === href || pathname.startsWith(href + "/");
        const Icon = tab.icon;

        return (
          <Link
            key={tab.segment}
            href={href}
            className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              isActive
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border)]"
            }`}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
