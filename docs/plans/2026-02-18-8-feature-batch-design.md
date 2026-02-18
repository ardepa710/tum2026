# TUM2026 — 8-Feature Batch Design

**Date:** 2026-02-18
**Approach:** Foundation-First (3 layers)
**Dependency added:** `@react-pdf/renderer`

---

## Layer 1: Infrastructure

### 1.1 RBAC Enforcement

**Role access matrix:**

| Page | ADMIN | EDITOR | VIEWER |
|------|-------|--------|--------|
| Dashboard | Full | Full | Read-only (no quick actions) |
| Tenants (list + detail) | CRUD | CRUD | Read-only |
| Users / Groups / Licenses | Full | Full | Full (read-only by nature) |
| Tasks | CRUD | View + Execute | Read-only |
| Task Runs | Full | Full | Read-only |
| Permissions | Full | **Hidden** | **Hidden** |
| Technicians | Full | **Hidden** | **Hidden** |
| Runbooks | CRUD | View + Create | Read-only |
| Audit Logs | Full | Full | **Hidden** |
| Service Health | Full | Full | Full |
| Alerts | Full | Full | Full |
| Reporting | Full | Full | Read-only (can export) |
| Settings | Full + Admin section | Own profile only | Own profile only |

**Implementation:**

1. `src/lib/rbac.ts` — Central helper:
   - `getSessionRole()` → Role from JWT session
   - `requireRole(minRole)` → throws/redirects if insufficient
   - `canAccess(page)` → boolean
   - `ROLE_HIERARCHY: ADMIN > EDITOR > VIEWER`

2. Server actions — Each action verifies role before executing.

3. Sidebar — Filters nav items based on role (hides Permissions/Technicians/Logs for non-ADMIN).

4. Protected pages — Permissions, Technicians, Logs pages verify role and redirect to `/dashboard`.

5. Conditional UI — Create/Edit/Delete buttons hidden per role.

---

### 1.2 Mobile Responsive Layout

**Breakpoints:**
- `< 768px` (sm): Mobile — hidden sidebar, bottom nav, full-width content
- `768px–1024px` (md): Tablet — collapsible sidebar (icons only 64px)
- `> 1024px` (lg): Desktop — full sidebar 260px (unchanged)

**Changes:**

1. Sidebar:
   - Desktop (lg+): Fixed 260px (no change)
   - Tablet (md): Collapsed 64px (icons only), expandable on hover/click
   - Mobile (< md): Hidden + hamburger in header + bottom nav (5 primary links)

2. Header: Mobile → hamburger (left) + logo (center) + notification bell (right). Search → expandable full-width on tap.

3. Tables: `overflow-x-auto` on all tables.

4. Slide-over panels: Full-screen on mobile.

5. New CSS variables: `--sidebar-width-collapsed: 64px; --bottom-nav-height: 64px;`

6. New components:
   - `src/components/layout/bottom-nav.tsx`
   - `src/components/layout/mobile-menu.tsx`

---

### 1.3 TanStack Table — Reusable Base Component

**`src/components/ui/data-table.tsx`**

Props: columns, data, searchable, searchPlaceholder, pagination (pageSize/pageIndex/totalCount), onPaginationChange, exportable, sortable.

Features: sorting (click headers), global search/filter, pagination (Prev/Next + indicator), column visibility toggle, empty state, loading skeleton, responsive overflow.

Applied to: Logs, Runs, Tenants list, Technicians list, Permissions list, Reporting tables.

---

## Layer 2: Features

### 2.1 Dashboard Analytics (Recharts)

**Charts:**

1. Task Runs Trend (BarChart — last 30 days): Stacked bars SUCCESS (green) + FAILED (red). Data: `GROUP BY DATE(startedAt), status` from TaskRun.

2. License Utilization (PieChart/Donut — top 5 SKUs): consumed vs available. Data: Graph API `/subscribedSkus`. Cached 1hr.

3. Tenant Health Overview (Horizontal BarChart): One bar per tenant, colored by score. Click → navigate to tenant detail.

4. Audit Activity (AreaChart — last 14 days): Event count per day. Data: `GROUP BY DATE(timestamp)` from AuditLog.

**Dashboard layout:**
```
[Stats Cards — 4 cards, unchanged]
[Task Runs (2/3) | License Utilization (1/3)]
[Tenant Health (1/2) | Audit Activity (1/2)]
[Recent Activity — unchanged]
[Quick Actions — RBAC-conditioned]
```

**New API routes:**
- `GET /api/analytics/task-runs?days=30`
- `GET /api/analytics/licenses`
- `GET /api/analytics/health-overview`
- `GET /api/analytics/audit-activity?days=14`

**Component:** `src/components/dashboard-charts.tsx` (client, uses Recharts).

---

### 2.2 Global Search Expanded

**Two-phase search:**

1. Instant (< 50ms) — DB local: Tenants (name/abbrv), Tasks (name/code), Technicians (name/email), Runbooks (title).

2. Async (1-3s) — Graph API: AD Users (existing flow).

**Two parallel fetches from component:**
- `/api/search/local?q=` (DB)
- `/api/search/users?q=` (Graph API, existing)

**UI:** Grouped results with section headers. Max 5 per section + "See all" link. Local results instant, users show spinner. Cmd/Ctrl+K shortcut. Arrow key navigation.

---

### 2.3 Runbooks CRUD

Model exists in Prisma. Categories: Onboarding, Offboarding, Security, Maintenance, Troubleshooting, Other.

**Pages:**
- `/dashboard/runbooks` — Card grid, filterable by category
- `/dashboard/runbooks/new` — Create form
- `/dashboard/runbooks/[id]` — View (render markdown)
- `/dashboard/runbooks/[id]/edit` — Edit form

**Components:** runbook-form.tsx, markdown-renderer.tsx (no external dep — regex-based), delete-runbook-button.tsx.

**Server actions:** createRunbook, updateRunbook, deleteRunbook — with audit logging + RBAC.

---

### 2.4 Alerts (On-Demand)

Calculated on page load (dashboard + alerts page). No cron.

**Alert types:**

| Type | Severity | Condition |
|------|----------|-----------|
| License expiry | Warning | < 30 days remaining |
| Low utilization | Info | consumed/total < 20% |
| Service degradation | Error/Warning | status !== "serviceOperational" |
| Low tenant health | Warning | score < 50 |
| Failed task runs | Error | FAILED runs in last 24h |
| Stale tech sync | Info | lastSyncAt > 7 days |

**Implementation:**
- `src/lib/alerts.ts` — `generateAlerts(): Promise<Alert[]>`
- `GET /api/alerts` — Cached 10min TTL
- Dashboard: alert banner with count + link
- `/dashboard/alerts` — Full alert list grouped by severity

---

## Layer 3: Output

### 3.1 Reporting + Export

**Page:** `/dashboard/reports`

**Reports:** License Utilization, Tenant Health Summary, Task Run History, Security Posture, Technician Permissions.

**Flow:** Report selector → Preview in DataTable → Export (CSV / PDF).

**CSV:** Server-side generation, same pattern as logs/export.

**PDF:** Client-side with `@react-pdf/renderer`. Template: header (logo + title + date), data table, footer.

**API routes:**
- `GET /api/reports/[licenses|health|task-runs|security|tech-permissions]` — JSON data
- `GET /api/reports/[type]/csv?from=&to=` — CSV download

---

## File Summary

**~35 new files, ~15 modified files. 1 new dependency (`@react-pdf/renderer`).**
