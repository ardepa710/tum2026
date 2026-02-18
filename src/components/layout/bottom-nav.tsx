"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Users, Cog, Settings } from "lucide-react";

const bottomNavItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/tenants", label: "Tenants", icon: Building2 },
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/tasks", label: "Tasks", icon: Cog },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[var(--bg-secondary)] border-t border-[var(--border)] flex items-center justify-around z-50 px-2">
      {bottomNavItems.map((item) => {
        const isActive = item.href === "/dashboard"
          ? pathname === "/dashboard"
          : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors min-w-[56px] ${
              isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
            }`}>
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
