# 8-Feature Batch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add RBAC, Mobile Responsive, TanStack Tables, Dashboard Analytics, Global Search, Runbooks, Alerts, and Reporting to the TUM2026 IT Admin Dashboard.

**Architecture:** Foundation-First in 3 layers. Layer 1 builds infrastructure (RBAC, mobile layout, reusable table). Layer 2 adds features on top (charts, search, runbooks, alerts). Layer 3 adds output capabilities (reports, PDF/CSV export). Each layer depends on the previous.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Prisma 7, Recharts 3.7, TanStack React Table 8.21, @react-pdf/renderer (new dep), Lucide React.

**Verification:** This project has no test framework. Use `npx tsc --noEmit` for type-checking and `npm run build` for build verification after each layer.

---

## Layer 1: Infrastructure

---

### Task 1: RBAC Helper Library

**Files:**
- Create: `src/lib/rbac.ts`
- Modify: `src/lib/auth.ts` (add role to JWT/session)

**Step 1: Create `src/lib/rbac.ts`**

```typescript
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export type Role = "ADMIN" | "EDITOR" | "VIEWER";

const ROLE_LEVEL: Record<Role, number> = {
  ADMIN: 3,
  EDITOR: 2,
  VIEWER: 1,
};

// Pages hidden per role
const PAGE_ACCESS: Record<string, Role> = {
  "/dashboard/permissions": "ADMIN",
  "/dashboard/technicians": "ADMIN",
  "/dashboard/logs": "EDITOR",
};

export async function getSessionRole(): Promise<Role> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (session.user as { role?: Role }).role || "VIEWER";
}

export function hasMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[minRole];
}

export async function requireRole(minRole: Role): Promise<Role> {
  const role = await getSessionRole();
  if (!hasMinRole(role, minRole)) {
    redirect("/dashboard");
  }
  return role;
}

export function canAccessPage(role: Role, pathname: string): boolean {
  for (const [page, minRole] of Object.entries(PAGE_ACCESS)) {
    if (pathname.startsWith(page) && !hasMinRole(role, minRole)) {
      return false;
    }
  }
  return true;
}

export function getVisibleNavItems(role: Role) {
  // Returns nav item hrefs that this role can see
  const hidden: string[] = [];
  for (const [page, minRole] of Object.entries(PAGE_ACCESS)) {
    if (!hasMinRole(role, minRole)) {
      hidden.push(page);
    }
  }
  return hidden;
}
```

**Step 2: Modify `src/lib/auth.ts` — add role to JWT and session**

In the `jwt` callback, after the existing `if (user)` block, add a DB lookup for the role:

```typescript
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id;
      // Fetch role from DB
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        token.role = dbUser?.role || "VIEWER";
      } catch {
        token.role = "VIEWER";
      }
    }
    return token;
  },
  async session({ session, token }) {
    if (session.user && token.id) {
      session.user.id = token.id as string;
      (session.user as Record<string, unknown>).role = token.role || "VIEWER";
    }
    return session;
  },
},
```

**Step 3: Verify types compile**

Run: `cd /home/ardepa/tum2026 && npx tsc --noEmit`
Expected: No errors related to rbac.ts

**Step 4: Commit**

```bash
git add src/lib/rbac.ts src/lib/auth.ts
git commit -m "feat: add RBAC helper library and role in JWT session"
```

---

### Task 2: RBAC Enforcement in Server Actions

**Files:**
- Modify: `src/app/dashboard/tenants/new/actions.ts`
- Modify: `src/app/dashboard/tasks/actions.ts`
- Modify: `src/app/dashboard/permissions/actions.ts`
- Modify: `src/app/dashboard/technicians/actions.ts`

**Step 1: Add role check to each server action file**

Pattern — add at the top of each mutating action:

```typescript
import { requireRole } from "@/lib/rbac";
```

Then at the start of each function body:

- `createTenant`, `updateTenant`, `deleteTenant` → `await requireRole("EDITOR");`
- `createMasterTask`, `updateMasterTask`, `deleteMasterTask` → `await requireRole("EDITOR");`
- All permission actions → `await requireRole("ADMIN");`
- `syncTechnicians`, `deleteTechnician` → `await requireRole("ADMIN");`

For example in `tenants/new/actions.ts`:
```typescript
export async function createTenant(_prevState: { error: string }, formData: FormData) {
  await requireRole("EDITOR"); // <-- add this line
  const session = await auth();
  // ... rest unchanged
}
```

**Step 2: Commit**

```bash
git add src/app/dashboard/tenants/new/actions.ts src/app/dashboard/tasks/actions.ts src/app/dashboard/permissions/actions.ts src/app/dashboard/technicians/actions.ts
git commit -m "feat: enforce RBAC role checks in all server actions"
```

---

### Task 3: RBAC in Sidebar and Protected Pages

**Files:**
- Modify: `src/components/layout/sidebar.tsx` — filter nav items by role
- Modify: `src/app/dashboard/permissions/page.tsx` — add role gate
- Modify: `src/app/dashboard/technicians/page.tsx` — add role gate
- Modify: `src/app/dashboard/logs/page.tsx` — add role gate
- Modify: `src/app/dashboard/page.tsx` — conditionally hide Quick Actions

**Step 1: Modify sidebar to accept role prop and filter items**

The sidebar is a client component. Pass role as a prop from the dashboard layout. In `sidebar.tsx`:

```typescript
import { type Role, canAccessPage } from "@/lib/rbac";

// Add role prop
export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();

  const visibleItems = navItems.filter((item) => canAccessPage(role, item.href));

  // In the nav section, map visibleItems instead of navItems
```

In `src/app/dashboard/layout.tsx`, fetch the role and pass it:

```typescript
import { getSessionRole } from "@/lib/rbac";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const role = await getSessionRole();
  return (
    <div className="min-h-screen">
      <Sidebar role={role} />
      <div className="ml-[var(--sidebar-width)]">
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
```

**Step 2: Add role gate to protected pages**

At the top of each protected page's `default export` function:

```typescript
import { requireRole } from "@/lib/rbac";

export default async function PermissionsPage() {
  await requireRole("ADMIN");
  // ... existing code
}
```

Same for `technicians/page.tsx` → `await requireRole("ADMIN");`
Same for `logs/page.tsx` → `await requireRole("EDITOR");`

**Step 3: Conditionally hide Quick Actions on dashboard**

In `dashboard/page.tsx`, fetch role and conditionally render:

```typescript
import { getSessionRole, hasMinRole } from "@/lib/rbac";

export default async function DashboardPage() {
  const role = await getSessionRole();
  // ... existing code ...

  // Wrap Quick Actions section:
  {hasMinRole(role, "EDITOR") && (
    <div className="bg-[var(--bg-card)] ...">
      <h3>Quick Actions</h3>
      ...
    </div>
  )}
}
```

**Step 4: Conditionally hide CRUD buttons in all pages**

Pass `role` to pages that have Create/Edit/Delete buttons. Hide them for VIEWER:

Pattern for list pages (e.g., tenants, tasks):
```typescript
{hasMinRole(role, "EDITOR") && (
  <Link href="/dashboard/tenants/new" className="...">
    <Plus /> Add Tenant
  </Link>
)}
```

**Step 5: Commit**

```bash
git add src/components/layout/sidebar.tsx src/app/dashboard/layout.tsx src/app/dashboard/page.tsx src/app/dashboard/permissions/page.tsx src/app/dashboard/technicians/page.tsx src/app/dashboard/logs/page.tsx
git commit -m "feat: RBAC in sidebar nav, protected pages, and conditional UI"
```

---

### Task 4: Mobile Layout — Sidebar Refactor + CSS Variables

**Files:**
- Modify: `src/app/globals.css` — add mobile CSS variables
- Modify: `src/app/dashboard/layout.tsx` — responsive structure
- Modify: `src/components/layout/sidebar.tsx` — collapsible + mobile hidden
- Modify: `src/components/layout/header.tsx` — hamburger button on mobile

**Step 1: Add CSS variables to `globals.css`**

Add after `--sidebar-width: 260px;` in `:root`:
```css
  --sidebar-width-collapsed: 64px;
  --bottom-nav-height: 64px;
```

Add responsive utility at the bottom of the file:
```css
/* Mobile: hide sidebar, show bottom nav */
@media (max-width: 767px) {
  :root {
    --sidebar-width: 0px;
  }
}

/* Tablet: collapsed sidebar */
@media (min-width: 768px) and (max-width: 1023px) {
  :root {
    --sidebar-width: 64px;
  }
}
```

**Step 2: Refactor sidebar for 3 modes**

Modify `sidebar.tsx` to support collapsed mode on tablet and hidden on mobile:

```typescript
export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleItems = navItems.filter((item) => canAccessPage(role, item.href));

  return (
    <>
      {/* Desktop sidebar (lg+) */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-[260px] bg-[var(--bg-secondary)] border-r border-[var(--border)] flex-col z-50">
        {/* Logo */}
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
          {visibleItems.map((item) => {
            const isActive = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                }`}>
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-[var(--border)]">
          <button onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors w-full">
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Tablet sidebar (md only) — icons only */}
      <aside className="hidden md:flex lg:hidden fixed left-0 top-0 h-full w-16 bg-[var(--bg-secondary)] border-r border-[var(--border)] flex-col items-center z-50 py-4">
        <Link href="/dashboard" className="w-10 h-10 bg-[var(--accent)] rounded-lg flex items-center justify-center mb-6">
          <Shield className="w-5 h-5 text-white" />
        </Link>
        <nav className="flex-1 space-y-2 overflow-y-auto">
          {visibleItems.map((item) => {
            const isActive = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} title={item.label}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                  isActive ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                }`}>
                <Icon className="w-5 h-5" />
              </Link>
            );
          })}
        </nav>
        <button onClick={() => signOut({ callbackUrl: "/login" })} title="Sign Out"
          className="w-10 h-10 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </aside>

      {/* Mobile overlay menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-[var(--bg-secondary)] flex flex-col animate-slide-in">
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
              <Link href="/dashboard" className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[var(--accent)] rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-lg font-bold text-[var(--text-primary)]">TUM 2026</h1>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="text-[var(--text-muted)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {visibleItems.map((item) => {
                const isActive = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                    }`}>
                    <Icon className="w-5 h-5" /> {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-[var(--border)]">
              <button onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] w-full">
                <LogOut className="w-5 h-5" /> Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
```

Also export a way for the header to open the mobile menu. Use a shared state approach:
- Add `onOpenMobileMenu` callback prop to Sidebar
- Or use a simple DOM event approach

Simplest: export `setMobileOpen` via a global event:
```typescript
// In sidebar, listen for custom event:
useEffect(() => {
  const handler = () => setMobileOpen(true);
  window.addEventListener("open-mobile-menu", handler);
  return () => window.removeEventListener("open-mobile-menu", handler);
}, []);
```

**Step 3: Modify header for mobile hamburger**

In `header.tsx`, add a hamburger button visible only on mobile:

```typescript
// Make header a client component wrapper or add a client MobileMenuButton
// Simplest: create a small client component
```

Create `src/components/layout/mobile-menu-button.tsx`:
```typescript
"use client";
import { Menu } from "lucide-react";

export function MobileMenuButton() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("open-mobile-menu"))}
      className="md:hidden w-10 h-10 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}
```

In `header.tsx`, import and add before GlobalSearch:
```typescript
import { MobileMenuButton } from "@/components/layout/mobile-menu-button";

// In the header JSX, before GlobalSearch:
<div className="flex items-center gap-3">
  <MobileMenuButton />
  <div className="hidden sm:block">
    <GlobalSearch />
  </div>
</div>
```

**Step 4: Update dashboard layout for responsive margins**

```typescript
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const role = await getSessionRole();
  return (
    <div className="min-h-screen">
      <Sidebar role={role} />
      <div className="md:ml-16 lg:ml-[260px] pb-[var(--bottom-nav-height)] md:pb-0">
        <Header />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
```

**Step 5: Add slide-in animation to globals.css**

```css
@keyframes slide-in {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}
.animate-slide-in {
  animation: slide-in 0.2s ease-out;
}
```

**Step 6: Commit**

```bash
git add src/app/globals.css src/components/layout/sidebar.tsx src/components/layout/header.tsx src/components/layout/mobile-menu-button.tsx src/app/dashboard/layout.tsx
git commit -m "feat: mobile responsive layout with collapsible sidebar and hamburger menu"
```

---

### Task 5: Bottom Navigation (Mobile)

**Files:**
- Create: `src/components/layout/bottom-nav.tsx`
- Modify: `src/app/dashboard/layout.tsx` — add BottomNav

**Step 1: Create bottom nav component**

```typescript
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[var(--bottom-nav-height)] bg-[var(--bg-secondary)] border-t border-[var(--border)] flex items-center justify-around z-50 px-2">
      {bottomNavItems.map((item) => {
        const isActive = item.href === "/dashboard"
          ? pathname === "/dashboard"
          : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors min-w-[56px] ${
              isActive
                ? "text-[var(--accent)]"
                : "text-[var(--text-muted)] active:text-[var(--text-primary)]"
            }`}>
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

**Step 2: Add to layout**

In `dashboard/layout.tsx`:
```typescript
import { BottomNav } from "@/components/layout/bottom-nav";

// Inside the return, after </div>:
<BottomNav />
```

**Step 3: Commit**

```bash
git add src/components/layout/bottom-nav.tsx src/app/dashboard/layout.tsx
git commit -m "feat: add bottom navigation bar for mobile devices"
```

---

### Task 6: TanStack DataTable Component

**Files:**
- Create: `src/components/ui/data-table.tsx`

**Step 1: Create the reusable DataTable component**

```typescript
"use client";

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Download, ChevronLeft, ChevronRight, Columns3 } from "lucide-react";

interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  exportable?: boolean;
  exportFilename?: string;
}

export function DataTable<T>({
  columns,
  data,
  searchable = false,
  searchPlaceholder = "Search...",
  pageSize = 25,
  exportable = false,
  exportFilename = "export",
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState({});
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  function exportCsv() {
    const headers = table.getVisibleFlatColumns().map((col) => col.id);
    const rows = table.getFilteredRowModel().rows.map((row) =>
      headers.map((h) => {
        const val = row.getValue(h);
        const str = String(val ?? "");
        return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      })
    );
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportFilename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Toolbar */}
      {(searchable || exportable) && (
        <div className="flex items-center justify-between gap-3 p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            {searchable && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="pl-9 pr-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] w-64"
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Column visibility */}
            <div className="relative">
              <button
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors"
                title="Toggle columns"
              >
                <Columns3 className="w-4 h-4" />
              </button>
              {showColumnMenu && (
                <div className="absolute right-0 top-full mt-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg p-2 z-10 min-w-[160px]">
                  {table.getAllLeafColumns().map((column) => (
                    <label key={column.id} className="flex items-center gap-2 px-2 py-1 text-xs text-[var(--text-secondary)] cursor-pointer hover:bg-[var(--bg-hover)] rounded">
                      <input
                        type="checkbox"
                        checked={column.getIsVisible()}
                        onChange={column.getToggleVisibilityHandler()}
                        className="rounded"
                      />
                      {column.id}
                    </label>
                  ))}
                </div>
              )}
            </div>
            {exportable && (
              <button onClick={exportCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded-lg hover:text-[var(--text-primary)] transition-colors">
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    {header.isPlaceholder ? null : (
                      <button
                        className={`flex items-center gap-1.5 ${header.column.getCanSort() ? "cursor-pointer select-none hover:text-[var(--text-primary)]" : ""}`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          header.column.getIsSorted() === "asc" ? <ArrowUp className="w-3 h-3" /> :
                          header.column.getIsSorted() === "desc" ? <ArrowDown className="w-3 h-3" /> :
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-[var(--text-muted)]">
                  No data to display.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--text-muted)]">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}–
            {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)} of {table.getFilteredRowModel().rows.length}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-[var(--text-muted)]">
              {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            </span>
            <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify build**

Run: `cd /home/ardepa/tum2026 && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/components/ui/data-table.tsx
git commit -m "feat: add reusable DataTable component with TanStack Table"
```

---

### Task 7: Migrate Existing Tables to DataTable

**Files:**
- Modify: `src/app/dashboard/logs/page.tsx` — use DataTable
- Modify: `src/app/dashboard/runs/page.tsx` — use DataTable

**Step 1: Refactor logs page**

The logs page currently does server-side pagination. Convert to use DataTable for client-side sort/filter while keeping server-side pagination for large datasets.

Strategy: Keep the server-side fetching, but use DataTable for rendering. Pass the data array to DataTable. Keep URL-based pagination since the dataset can be large.

Create a client wrapper `src/components/logs-table.tsx`:
```typescript
"use client";
import { DataTable } from "@/components/ui/data-table";
import { createColumnHelper } from "@tanstack/react-table";
import { ActionBadge } from "@/components/action-badge";

interface AuditLogRow {
  id: number;
  timestamp: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
}

const columnHelper = createColumnHelper<AuditLogRow>();
const columns = [
  columnHelper.accessor("timestamp", { header: "Timestamp", cell: (info) => info.getValue() }),
  columnHelper.accessor("actor", { header: "Actor" }),
  columnHelper.accessor("action", { header: "Action", cell: (info) => <ActionBadge action={info.getValue()} /> }),
  columnHelper.accessor("entity", { header: "Entity", cell: (info) => <span className="font-mono">{info.getValue()}</span> }),
  columnHelper.accessor("entityId", { header: "ID", cell: (info) => info.getValue() ?? "—" }),
  columnHelper.accessor("details", { header: "Details", cell: (info) => <span className="max-w-[200px] truncate block">{info.getValue() ?? "—"}</span> }),
];

export function LogsTable({ data }: { data: AuditLogRow[] }) {
  return <DataTable columns={columns} data={data} searchable searchPlaceholder="Filter logs..." exportable exportFilename="audit-logs" />;
}
```

Then in the server page, replace the manual table with:
```typescript
<LogsTable data={logs.map(l => ({
  ...l,
  timestamp: l.timestamp.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  entityId: l.entityId ?? null,
  details: l.details ?? null,
}))} />
```

**Step 2: Similarly refactor runs page** with a `RunsTable` client component.

**Step 3: Commit**

```bash
git add src/components/logs-table.tsx src/components/runs-table.tsx src/app/dashboard/logs/page.tsx src/app/dashboard/runs/page.tsx
git commit -m "feat: migrate logs and runs tables to TanStack DataTable"
```

---

### Task 8: Layer 1 Build Verification

**Step 1:** Run full type check: `npx tsc --noEmit`
**Step 2:** Run build: `npm run build`
**Step 3:** Fix any errors
**Step 4:** Commit fixes if any

```bash
git commit -m "fix: resolve build errors from Layer 1 implementation"
```

---

## Layer 2: Features

---

### Task 9: Dashboard Analytics — API Routes

**Files:**
- Create: `src/app/api/analytics/task-runs/route.ts`
- Create: `src/app/api/analytics/audit-activity/route.ts`
- Create: `src/app/api/analytics/health-overview/route.ts`
- Create: `src/app/api/analytics/licenses/route.ts`

**Step 1: Task Runs analytics route**

```typescript
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const days = Number(request.nextUrl.searchParams.get("days")) || 30;
  const since = new Date(Date.now() - days * 86400000);

  const runs = await prisma.taskRun.findMany({
    where: { startedAt: { gte: since } },
    select: { startedAt: true, status: true },
    orderBy: { startedAt: "asc" },
  });

  // Group by date and status
  const grouped: Record<string, { date: string; SUCCESS: number; FAILED: number; RUNNING: number }> = {};
  for (const run of runs) {
    const date = run.startedAt.toISOString().split("T")[0];
    if (!grouped[date]) grouped[date] = { date, SUCCESS: 0, FAILED: 0, RUNNING: 0 };
    grouped[date][run.status as "SUCCESS" | "FAILED" | "RUNNING"]++;
  }

  return Response.json(Object.values(grouped));
}
```

**Step 2: Audit Activity analytics route** — similar pattern, GROUP BY date from AuditLog.

**Step 3: Health Overview route** — fetch all tenants, call `calculateHealthScore()` for each, return array.

**Step 4: License analytics route** — fetch all tenants, call Graph API `getLicenses()` for each, aggregate by SKU. Cache 1hr.

**Step 5: Commit**

```bash
git add src/app/api/analytics/
git commit -m "feat: add analytics API routes for dashboard charts"
```

---

### Task 10: Dashboard Analytics — Charts + Page Update

**Files:**
- Create: `src/components/dashboard-charts.tsx`
- Modify: `src/app/dashboard/page.tsx`

**Step 1: Create charts component**

Client component using Recharts. Four chart sections:
- `TaskRunsChart` — BarChart with stacked SUCCESS/FAILED
- `LicenseChart` — PieChart with top 5 SKUs
- `HealthOverview` — BarChart horizontal with tenant scores
- `AuditActivityChart` — AreaChart with event counts

Each fetches its own data from `/api/analytics/*` using `useEffect`.

```typescript
"use client";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { Loader2 } from "lucide-react";

const COLORS = {
  success: "var(--success)",
  failed: "var(--error)",
  accent: "var(--accent)",
};
const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function ChartCard({ title, children, loading }: { title: string; children: React.ReactNode; loading: boolean }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">{title}</h3>
      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-[var(--text-muted)] animate-spin" />
        </div>
      ) : (
        <div className="h-48">{children}</div>
      )}
    </div>
  );
}

export function TaskRunsChart() { /* fetch /api/analytics/task-runs, render BarChart */ }
export function LicenseChart() { /* fetch /api/analytics/licenses, render PieChart */ }
export function HealthOverviewChart() { /* fetch /api/analytics/health-overview, render horizontal BarChart */ }
export function AuditActivityChart() { /* fetch /api/analytics/audit-activity, render AreaChart */ }

export function DashboardCharts() {
  return (
    <div className="space-y-6 mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><TaskRunsChart /></div>
        <div><LicenseChart /></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HealthOverviewChart />
        <AuditActivityChart />
      </div>
    </div>
  );
}
```

Implement each chart function following the same pattern: `useEffect` fetch → loading state → Recharts render.

**Step 2: Modify dashboard page**

Import `DashboardCharts` and place between Stats Grid and the two-column layout:
```typescript
import { DashboardCharts } from "@/components/dashboard-charts";

// After Stats Grid, before two-column layout:
<DashboardCharts />
```

**Step 3: Commit**

```bash
git add src/components/dashboard-charts.tsx src/app/dashboard/page.tsx
git commit -m "feat: add dashboard analytics charts with Recharts"
```

---

### Task 11: Global Search Expansion

**Files:**
- Create: `src/app/api/search/local/route.ts`
- Modify: `src/components/global-search.tsx`

**Step 1: Create local search API**

```typescript
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return Response.json({ tenants: [], tasks: [], technicians: [], runbooks: [] });

  const [tenants, tasks, technicians, runbooks] = await Promise.all([
    prisma.tenant.findMany({
      where: { OR: [
        { tenantName: { contains: q, mode: "insensitive" } },
        { tenantAbbrv: { contains: q, mode: "insensitive" } },
      ] },
      select: { id: true, tenantName: true, tenantAbbrv: true },
      take: 5,
    }),
    prisma.masterTask.findMany({
      where: { OR: [
        { taskName: { contains: q, mode: "insensitive" } },
        { taskCode: { contains: q, mode: "insensitive" } },
      ] },
      select: { id: true, taskName: true, taskCode: true },
      take: 5,
    }),
    prisma.technician.findMany({
      where: { OR: [
        { displayName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ] },
      select: { id: true, displayName: true, email: true },
      take: 5,
    }),
    prisma.runbook.findMany({
      where: { title: { contains: q, mode: "insensitive" } },
      select: { id: true, title: true, category: true },
      take: 5,
    }),
  ]);

  return Response.json({ tenants, tasks, technicians, runbooks });
}
```

**Step 2: Refactor GlobalSearch component**

- Two parallel fetches: `/api/search/local?q=` (instant) and existing `/api/search?q=` (users, slower)
- Group results by type with section headers
- Add `Cmd+K` keyboard shortcut to focus search
- Show local results immediately, users load async with spinner

Key changes to `global-search.tsx`:
- Add `useEffect` for Cmd+K handler
- Replace single fetch with two parallel fetches
- Render grouped results: Tenants → Tasks → Technicians → Runbooks → Users
- Each result type navigates to its appropriate page

**Step 3: Commit**

```bash
git add src/app/api/search/local/route.ts src/components/global-search.tsx
git commit -m "feat: expand global search to tenants, tasks, technicians, runbooks"
```

---

### Task 12: Runbooks — Server Actions + Components

**Files:**
- Create: `src/app/dashboard/runbooks/actions.ts`
- Create: `src/components/runbook-form.tsx`
- Create: `src/components/markdown-renderer.tsx`
- Create: `src/components/delete-runbook-button.tsx`

**Step 1: Server actions**

Follow the same pattern as `tenants/new/actions.ts`:

```typescript
"use server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { logAudit, getActor } from "@/lib/audit";

export async function createRunbook(_prevState: { error: string }, formData: FormData) {
  await requireRole("EDITOR");
  const actor = await getActor();
  const title = (formData.get("title") as string)?.trim();
  const category = (formData.get("category") as string)?.trim();
  const content = (formData.get("content") as string) || "";
  const taskId = formData.get("taskId") ? Number(formData.get("taskId")) : null;

  if (!title) return { error: "Title is required." };
  if (!category) return { error: "Category is required." };

  let runbook;
  try {
    runbook = await prisma.runbook.create({
      data: { title, category, content, taskId, createdBy: actor },
    });
  } catch {
    return { error: "Failed to create runbook." };
  }

  logAudit({ actor, action: "CREATE", entity: "RUNBOOK", entityId: runbook.id, details: { title, category } });
  redirect(`/dashboard/runbooks/${runbook.id}`);
}

// updateRunbook, deleteRunbook — same pattern
```

**Step 2: Runbook form** — Client component with `useActionState`. Fields: title (text), category (select dropdown), taskId (optional select from MasterTasks), content (textarea).

**Step 3: Markdown renderer** — Simple regex-based renderer (no external dep):
- `# heading` → `<h1>`
- `**bold**` → `<strong>`
- `*italic*` → `<em>`
- `` `code` `` → `<code>`
- ```` ```block``` ```` → `<pre><code>`
- `- item` → `<li>`
- `[text](url)` → `<a>`

**Step 4: Delete button** — Same pattern as `delete-task-button.tsx` (two-step confirm).

**Step 5: Commit**

```bash
git add src/app/dashboard/runbooks/actions.ts src/components/runbook-form.tsx src/components/markdown-renderer.tsx src/components/delete-runbook-button.tsx
git commit -m "feat: add runbook server actions, form, and markdown renderer"
```

---

### Task 13: Runbooks — Pages

**Files:**
- Create: `src/app/dashboard/runbooks/page.tsx`
- Create: `src/app/dashboard/runbooks/new/page.tsx`
- Create: `src/app/dashboard/runbooks/[id]/page.tsx`
- Create: `src/app/dashboard/runbooks/[id]/edit/page.tsx`

**Step 1: List page** — Card grid with category filter dropdown. Each card: title, category badge, createdBy, updatedAt. Link to detail. "New Runbook" button (RBAC gated).

**Step 2: Create page** — RunbookForm with createRunbook action. Fetch MasterTasks for the taskId dropdown.

**Step 3: Detail page** — Header (title, category badge, linked task if any, Edit/Delete buttons gated by RBAC). Body: MarkdownRenderer with content. Footer: created/updated metadata.

**Step 4: Edit page** — RunbookForm pre-filled with existing data, using updateRunbook action.

**Step 5: Commit**

```bash
git add src/app/dashboard/runbooks/
git commit -m "feat: add runbook pages (list, create, detail, edit)"
```

---

### Task 14: Alerts — Engine + API

**Files:**
- Create: `src/lib/alerts.ts`
- Create: `src/app/api/alerts/route.ts`

**Step 1: Create alerts engine**

```typescript
import { prisma } from "@/lib/prisma";
import { getLicenses } from "@/lib/graph";
import { getServiceHealth } from "@/lib/graph";
import { calculateHealthScore } from "@/lib/health-score";

export interface Alert {
  id: string;
  type: "failed_runs" | "low_health" | "service_degraded" | "stale_sync" | "low_utilization";
  severity: "error" | "warning" | "info";
  title: string;
  description: string;
  tenantId?: number;
  tenantName?: string;
  link?: string;
}

// Cache alerts for 10 min
let alertCache: { data: Alert[]; expiresAt: number } | null = null;
const CACHE_TTL = 600000;

export async function generateAlerts(): Promise<Alert[]> {
  if (alertCache && alertCache.expiresAt > Date.now()) {
    return alertCache.data;
  }

  const alerts: Alert[] = [];

  // 1. Failed task runs in last 24h
  const failedRuns = await prisma.taskRun.findMany({
    where: { status: "FAILED", startedAt: { gte: new Date(Date.now() - 86400000) } },
    include: { task: { select: { taskName: true } }, tenant: { select: { tenantAbbrv: true } } },
  });
  for (const run of failedRuns) {
    alerts.push({
      id: `failed-run-${run.id}`,
      type: "failed_runs",
      severity: "error",
      title: `Task "${run.task.taskName}" failed`,
      description: `Failed for ${run.tenant.tenantAbbrv} at ${run.startedAt.toLocaleString()}. ${run.errorMessage || ""}`,
      link: `/dashboard/runs/${run.id}`,
    });
  }

  // 2. Stale technician sync (> 7 days)
  const staleTechs = await prisma.technician.findMany({
    where: { lastSyncAt: { lt: new Date(Date.now() - 7 * 86400000) } },
    select: { id: true, displayName: true, lastSyncAt: true },
    take: 5,
  });
  if (staleTechs.length > 0) {
    alerts.push({
      id: "stale-sync",
      type: "stale_sync",
      severity: "info",
      title: `Technician sync is stale`,
      description: `${staleTechs.length} technician(s) haven't been synced in over 7 days.`,
      link: "/dashboard/technicians",
    });
  }

  // 3. Low health scores + service degradation (per tenant, with try/catch)
  const tenants = await prisma.tenant.findMany({ select: { id: true, tenantName: true, tenantAbbrv: true, tenantIdMsft: true } });
  for (const tenant of tenants) {
    try {
      const { score } = await calculateHealthScore(tenant.id);
      if (score < 50) {
        alerts.push({
          id: `low-health-${tenant.id}`,
          type: "low_health",
          severity: "warning",
          title: `Low health score: ${tenant.tenantAbbrv}`,
          description: `Health score is ${score}/100.`,
          tenantId: tenant.id,
          tenantName: tenant.tenantName,
          link: `/dashboard/tenants/${tenant.id}`,
        });
      }
    } catch { /* skip tenant on error */ }

    try {
      const health = await getServiceHealth(tenant.id);
      const degraded = (health as { status: string; service: string }[]).filter(
        (s) => s.status !== "serviceOperational"
      );
      for (const svc of degraded) {
        alerts.push({
          id: `degraded-${tenant.id}-${svc.service}`,
          type: "service_degraded",
          severity: svc.status === "serviceInterruption" ? "error" : "warning",
          title: `${svc.service} degraded: ${tenant.tenantAbbrv}`,
          description: `Service status: ${svc.status}`,
          tenantId: tenant.id,
          tenantName: tenant.tenantName,
          link: `/dashboard/health`,
        });
      }
    } catch { /* skip */ }
  }

  alertCache = { data: alerts, expiresAt: Date.now() + CACHE_TTL };
  return alerts;
}
```

**Step 2: API route**

```typescript
import { auth } from "@/lib/auth";
import { generateAlerts } from "@/lib/alerts";

export async function GET() {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const alerts = await generateAlerts();
  return Response.json(alerts);
}
```

**Step 3: Commit**

```bash
git add src/lib/alerts.ts src/app/api/alerts/route.ts
git commit -m "feat: add alerts engine with on-demand generation and caching"
```

---

### Task 15: Alerts — Banner + Page

**Files:**
- Create: `src/components/alert-banner.tsx`
- Create: `src/app/dashboard/alerts/page.tsx`
- Modify: `src/app/dashboard/page.tsx` — add AlertBanner
- Modify: `src/components/layout/sidebar.tsx` — add Alerts nav item

**Step 1: Alert banner component (client)**

Fetches `/api/alerts` on mount, shows count of error/warning alerts with link to alerts page.

```typescript
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export function AlertBanner() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    fetch("/api/alerts").then(r => r.json()).then((alerts) => {
      const urgent = alerts.filter((a: { severity: string }) => a.severity === "error" || a.severity === "warning");
      setCount(urgent.length);
    }).catch(() => {});
  }, []);

  if (count === 0) return null;
  return (
    <div className="mb-6 px-4 py-3 bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded-xl flex items-center gap-3">
      <AlertTriangle className="w-5 h-5 text-[var(--warning)] shrink-0" />
      <p className="text-sm text-[var(--text-primary)] flex-1">
        <strong>{count}</strong> alert{count !== 1 ? "s" : ""} require attention
      </p>
      <Link href="/dashboard/alerts" className="text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]">
        View alerts
      </Link>
    </div>
  );
}
```

**Step 2: Alerts page** — Fetches `/api/alerts`, groups by severity (error first, then warning, then info). Each alert is a card with icon, title, description, tenant badge, link button.

**Step 3: Add AlertBanner to dashboard page** — Import and place after Stats Grid, before charts.

**Step 4: Add "Alerts" nav item to sidebar** — Icon: `AlertTriangle`, href: `/dashboard/alerts`, before Settings.

**Step 5: Commit**

```bash
git add src/components/alert-banner.tsx src/app/dashboard/alerts/page.tsx src/app/dashboard/page.tsx src/components/layout/sidebar.tsx
git commit -m "feat: add alerts banner on dashboard and dedicated alerts page"
```

---

### Task 16: Layer 2 Build Verification

Same as Task 8. Run `npx tsc --noEmit` and `npm run build`. Fix errors.

---

## Layer 3: Output

---

### Task 17: Report API Routes

**Files:**
- Create: `src/app/api/reports/licenses/route.ts`
- Create: `src/app/api/reports/health/route.ts`
- Create: `src/app/api/reports/task-runs/route.ts`
- Create: `src/app/api/reports/security/route.ts`
- Create: `src/app/api/reports/tech-permissions/route.ts`

Each route follows the same pattern: authenticate, fetch data, return JSON array.

**Step 1: License report** — Iterate tenants, fetch `getLicenses()`, flatten into rows: `{ tenant, sku, total, consumed, available, utilization }`.

**Step 2: Health report** — Iterate tenants, call `calculateHealthScore()`, return: `{ tenant, score, users, licenses, policies, status }`.

**Step 3: Task runs report** — Prisma query with date range filter, include task and tenant relations.

**Step 4: Security report** — Per tenant: CA policy count, enabled users count, disabled users count, health score.

**Step 5: Tech permissions** — Join technicians with their permissions.

**Step 6: Commit**

```bash
git add src/app/api/reports/
git commit -m "feat: add report API routes (licenses, health, runs, security, permissions)"
```

---

### Task 18: Report Page + CSV Export

**Files:**
- Create: `src/app/dashboard/reports/page.tsx`
- Create: `src/components/report-selector.tsx`

**Step 1: Report selector** — Client component. Dropdown for report type, optional date range inputs, "Generate" button. On generate, fetches the appropriate `/api/reports/*` endpoint and passes data to DataTable.

**Step 2: Reports page** — Server component wrapper. Contains ReportSelector. Each report type defines its own TanStack column definitions.

**Step 3: Add CSV export per report** — DataTable already has `exportable` prop. Pass `exportFilename` matching the report type.

**Step 4: Add "Reports" nav item to sidebar** — Icon: `FileBarChart`, href: `/dashboard/reports`, after Audit Logs.

**Step 5: Commit**

```bash
git add src/app/dashboard/reports/ src/components/report-selector.tsx src/components/layout/sidebar.tsx
git commit -m "feat: add reports page with selector, DataTable preview, and CSV export"
```

---

### Task 19: PDF Export

**Files:**
- Install: `@react-pdf/renderer`
- Create: `src/components/report-pdf.tsx`
- Modify: `src/components/report-selector.tsx` — add PDF button

**Step 1: Install dependency**

```bash
cd /home/ardepa/tum2026 && npm install @react-pdf/renderer
```

**Step 2: Create PDF template**

```typescript
"use client";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: { marginBottom: 20, borderBottom: "1px solid #e2e8f0", paddingBottom: 10 },
  title: { fontSize: 18, fontWeight: "bold", color: "#0f172a" },
  subtitle: { fontSize: 10, color: "#64748b", marginTop: 4 },
  table: { width: "100%" },
  tableRow: { flexDirection: "row", borderBottom: "0.5px solid #e2e8f0", paddingVertical: 4 },
  tableHeader: { flexDirection: "row", borderBottom: "1px solid #334155", paddingBottom: 6, marginBottom: 4 },
  cell: { flex: 1, paddingHorizontal: 4 },
  headerCell: { flex: 1, paddingHorizontal: 4, fontWeight: "bold", color: "#475569", fontSize: 9 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#94a3b8" },
});

interface ReportPdfProps {
  title: string;
  headers: string[];
  rows: string[][];
  generatedAt: string;
}

export function ReportPdf({ title, headers, rows, generatedAt }: ReportPdfProps) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>TUM 2026 — {title}</Text>
          <Text style={styles.subtitle}>Generated: {generatedAt}</Text>
        </View>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            {headers.map((h, i) => <Text key={i} style={styles.headerCell}>{h}</Text>)}
          </View>
          {rows.map((row, i) => (
            <View key={i} style={styles.tableRow}>
              {row.map((cell, j) => <Text key={j} style={styles.cell}>{cell}</Text>)}
            </View>
          ))}
        </View>
        <Text style={styles.footer}>Generated by TUM2026 IT Admin Dashboard</Text>
      </Page>
    </Document>
  );
}
```

**Step 3: Add PDF export button to report-selector.tsx**

Use `@react-pdf/renderer`'s `pdf()` function to generate blob client-side:

```typescript
import { pdf } from "@react-pdf/renderer";
import { ReportPdf } from "@/components/report-pdf";

async function exportPdf() {
  const blob = await pdf(
    <ReportPdf title={reportTitle} headers={columnHeaders} rows={dataRows} generatedAt={new Date().toLocaleString()} />
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${reportType}-report.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
```

**Step 4: Commit**

```bash
git add src/components/report-pdf.tsx src/components/report-selector.tsx package.json package-lock.json
git commit -m "feat: add PDF export with @react-pdf/renderer for reports"
```

---

### Task 20: Final Build Verification + Cleanup

**Step 1:** Run `npx tsc --noEmit`
**Step 2:** Run `npm run build`
**Step 3:** Fix any errors
**Step 4:** Verify sidebar has all new items: Alerts, Reports, Runbooks
**Step 5:** Verify mobile layout (resize browser)
**Step 6:** Final commit

```bash
git commit -m "fix: final build fixes and cleanup for 8-feature batch"
```

---

## Summary

| Task | Layer | Feature |
|------|-------|---------|
| 1 | 1 | RBAC helper library |
| 2 | 1 | RBAC in server actions |
| 3 | 1 | RBAC in sidebar + pages |
| 4 | 1 | Mobile sidebar refactor |
| 5 | 1 | Bottom navigation |
| 6 | 1 | TanStack DataTable component |
| 7 | 1 | Migrate existing tables |
| 8 | 1 | Layer 1 build verification |
| 9 | 2 | Analytics API routes |
| 10 | 2 | Dashboard charts |
| 11 | 2 | Global search expansion |
| 12 | 2 | Runbooks actions + components |
| 13 | 2 | Runbooks pages |
| 14 | 2 | Alerts engine + API |
| 15 | 2 | Alerts banner + page |
| 16 | 2 | Layer 2 build verification |
| 17 | 3 | Report API routes |
| 18 | 3 | Reports page + CSV |
| 19 | 3 | PDF export |
| 20 | 3 | Final build verification |

**Total: 20 tasks, ~35 new files, ~15 modified files, 1 new dependency.**
