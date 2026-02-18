"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { type Role, canAccessPage } from "@/lib/rbac-shared";
import {
  LayoutDashboard,
  Building2,
  Users,
  UsersRound,
  CreditCard,
  Cog,
  History,
  ShieldCheck,
  Wrench,
  BookOpen,
  HeartPulse,
  ScrollText,
  Settings,
  LogOut,
  Shield,
  X,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/tenants", label: "Tenants", icon: Building2 },
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/groups", label: "Groups", icon: UsersRound },
  { href: "/dashboard/licenses", label: "Licenses", icon: CreditCard },
  { href: "/dashboard/tasks", label: "Tasks", icon: Cog },
  { href: "/dashboard/runs", label: "Task Runs", icon: History },
  { href: "/dashboard/permissions", label: "Permissions", icon: ShieldCheck },
  { href: "/dashboard/technicians", label: "Technicians", icon: Wrench },
  { href: "/dashboard/runbooks", label: "Runbooks", icon: BookOpen },
  { href: "/dashboard/health", label: "Service Health", icon: HeartPulse },
  { href: "/dashboard/logs", label: "Audit Logs", icon: ScrollText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = navItems.filter((item) => canAccessPage(role, item.href));

  // Listen for mobile menu open event from header hamburger button
  useEffect(() => {
    const handler = () => setMobileOpen(true);
    window.addEventListener("open-mobile-menu", handler);
    return () => window.removeEventListener("open-mobile-menu", handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function NavLink({ item, showLabel = true }: { item: (typeof navItems)[number]; showLabel?: boolean }) {
    const isActive =
      item.href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname.startsWith(item.href);
    const Icon = item.icon;
    return (
      <Link
        href={item.href}
        title={!showLabel ? item.label : undefined}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center ${showLabel ? "gap-3 px-3" : "justify-center"} py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? "bg-[var(--accent)] text-white"
            : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        }`}
      >
        <Icon className="w-5 h-5 shrink-0" />
        {showLabel && item.label}
      </Link>
    );
  }

  return (
    <>
      {/* Desktop sidebar (lg+): full width with labels */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-[260px] bg-[var(--bg-secondary)] border-r border-[var(--border)] flex-col z-50">
        <div className="p-6 border-b border-[var(--border)]">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[var(--accent)] rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--text-primary)]">TUM 2026</h1>
              <p className="text-xs text-[var(--text-muted)]">IT Admin Dashboard</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>
        <div className="p-4 border-t border-[var(--border)]">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Tablet sidebar (md to lg): icons only */}
      <aside className="hidden md:flex lg:hidden fixed left-0 top-0 h-full w-16 bg-[var(--bg-secondary)] border-r border-[var(--border)] flex-col items-center z-50 py-4 gap-2">
        <Link href="/dashboard" className="w-10 h-10 bg-[var(--accent)] rounded-lg flex items-center justify-center mb-4 shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </Link>
        <nav className="flex-1 flex flex-col items-center gap-1 overflow-y-auto">
          {visibleItems.map((item) => (
            <NavLink key={item.href} item={item} showLabel={false} />
          ))}
        </nav>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sign Out"
          className="w-10 h-10 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors shrink-0"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </aside>

      {/* Mobile overlay menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-[var(--bg-secondary)] flex flex-col animate-slide-in-left">
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
              <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[var(--accent)] rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-lg font-bold text-[var(--text-primary)]">TUM 2026</h1>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {visibleItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </nav>
            <div className="p-4 border-t border-[var(--border)]">
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors w-full"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
