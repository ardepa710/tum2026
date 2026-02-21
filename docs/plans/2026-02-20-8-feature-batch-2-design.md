# 8-Feature Batch 2 — Design Document

**Date:** 2026-02-20
**Status:** Approved
**Branch:** `feat/8-feature-batch-2`

## Overview

Eight new features for the TUM2026 IT Admin Dashboard, building on the existing architecture (Next.js 16, Prisma 7, Microsoft Graph API, Vercel + Neon.tech).

---

## Feature 1: Real-time Updates (SSE)

### Problem
NotificationBell polls every 30s. Logs, runs, and alerts have no live updates.

### Solution
Single SSE endpoint `/api/sse/events` using `ReadableStream`.

- **Event types:** `notification`, `task-run-update`, `alert`, `tenant-update`
- **Client:** Custom `useSSE()` hook wrapping `EventSource` with auto-reconnect
- **Server:** Server actions call `emitEvent(type, payload)` which pushes to connected streams
- **In-memory event bus:** `Map<userId, Set<WritableStreamDefaultWriter>>` for per-user routing
- **Fallback:** If SSE fails (connection drop, Vercel timeout), client falls back to polling transparently
- **Vercel timeout:** ~30s on free tier; `EventSource` reconnects automatically via `retry` field

### Integration Points
- `notify.ts` → emit `notification` event after creating notification
- Task run actions → emit `task-run-update`
- Alert generation → emit `alert`
- Tenant CRUD → emit `tenant-update`

### Files
- `src/lib/sse.ts` — Event bus + emitEvent()
- `src/app/api/sse/events/route.ts` — SSE endpoint (GET, streaming)
- `src/hooks/use-sse.ts` — Client hook
- Update `notification-bell.tsx` — Replace polling with SSE + polling fallback

---

## Feature 2: Functional Global Search (Enhanced)

### Problem
GlobalSearch works but has no history, no filters, and no contextual actions.

### Solution

#### Recent Searches
- New model `SearchHistory` (userId, query, resultType, resultId, clickedLabel, timestamp)
- Save on result click, show last 5 on focus with empty query
- API: `/api/search/history` (GET recent, POST save, DELETE clear)

#### Type Filters
- Chips above results: All | Tenants | Users | Tasks | Runbooks | Technicians
- Client-side filter on existing `flat` array (no extra API calls)

#### Quick Actions
- On hover/keyboard-select, show action buttons per type:
  - **User:** View Details, Execute Task
  - **Tenant:** View, Users, Licenses
  - **Runbook:** View, Edit (if EDITOR+)
  - **Task:** View, Run History
- Actions navigate directly (no intermediate page)

### Files
- `prisma/schema.prisma` — Add `SearchHistory` model
- `src/app/api/search/history/route.ts` — CRUD
- Update `src/components/global-search.tsx` — Filters, actions, history

---

## Feature 3: License Optimization

### Problem
License dashboard shows raw data but no optimization insights.

### Solution

#### Optimization Engine (`src/lib/license-optimizer.ts`)
- **Underutilization detection:** `consumedUnits / prepaidUnits.enabled < 0.8` → flag
- **Price map:** Static JSON with estimated monthly cost per SKU ID (top 20 M365 SKUs)
- **Recommendations:** Generate actionable suggestions with estimated savings
- **Near-capacity:** `consumedUnits / prepaidUnits.enabled > 0.95` → warn about over-provisioning

#### Dashboard Integration
- New section in `/dashboard/licenses` with optimization cards
- Total estimated waste across all tenants
- Per-tenant breakdown with "View details" expansion
- Color-coded badges: green (optimized), yellow (review), red (wasteful)

#### Cache
- 1hr in-memory cache (same pattern as health-score)

### Files
- `src/lib/license-optimizer.ts` — Engine + price map
- `src/app/api/licenses/optimization/route.ts` — GET optimization results
- Update `src/components/license-dashboard.tsx` — Add optimization section
- `src/lib/types/license-optimization.ts` — TypeScript interfaces

---

## Feature 4: Notification Preference Enforcement

### Problem
`createNotification()` ignores user preferences. All users get all notifications.

### Solution
Add `category` parameter to `createNotification()`. Before inserting, check `NotificationPreference`.

#### Category Mapping
| Category | Preference Field | Triggered By |
|----------|-----------------|--------------|
| `task_run` | `onTaskRun` | Task execution starts |
| `task_fail` | `onTaskFail` | Task execution fails |
| `tech_sync` | `onTechSync` | Technician sync completes |
| `new_tenant` | `onNewTenant` | New tenant created |

#### Logic
1. If `category` is null/undefined → always create (backwards compatible)
2. Query `NotificationPreference` for `userId`
3. If no preference record → use defaults (all true)
4. If preference disables this category → skip silently
5. If enabled → create notification as before

#### No Schema Changes
Only logic change in `notify.ts` + update callers to pass category.

### Files
- Update `src/lib/notify.ts` — Add category param + preference check
- Update all callers (server actions) to pass appropriate category

---

## Feature 5: Compliance / Security Posture

### Problem
No unified security view. Health score exists but doesn't cover security-specific checks.

### Solution

#### 1. Security Score Engine (`src/lib/security-score.ts`)
Per-tenant score 0-100 based on Graph API checks:

| Check | Weight | Source |
|-------|--------|--------|
| Conditional Access policies active | 25 | `/identity/conditionalAccess/policies` |
| Admin count reasonable (< 5 Global Admins) | 20 | `/directoryRoles` + members |
| Disabled accounts ratio < 20% | 15 | `/users` accountEnabled stats |
| Guest user ratio < 30% | 15 | `/users` userType stats |
| Password policies configured | 10 | Existence of CA policies targeting password |
| Security defaults or CA present | 15 | Either security defaults ON or CA policies exist |

#### 2. Compliance Checklist (`src/lib/compliance-checks.ts`)
Array of checks with pass/fail/warning per tenant:
- Has active CA policies
- Global Admins <= 5
- Has break-glass account pattern (naming convention check)
- MFA enforced via CA policy
- No shared mailboxes with direct login enabled
- Guest access policy exists

#### 3. Security Snapshots (new model)
```
SecuritySnapshot: id, tenantId FK, score Int, checksJson Text, capturedAt DateTime
```
- Triggered manually via button or API call
- Enables trend line chart over time
- Retention: keep last 90 days per tenant

#### Page: `/dashboard/security`
- Radar chart per tenant (Recharts)
- Expandable compliance checklist with pass/fail badges
- Trend line chart (last 30 days, from snapshots)
- "Capture Snapshot" button (ADMIN only)

### Files
- `prisma/schema.prisma` — Add `SecuritySnapshot` model
- `src/lib/security-score.ts` — Score engine
- `src/lib/compliance-checks.ts` — Checklist engine
- `src/lib/types/security.ts` — TypeScript interfaces
- `src/app/api/security/score/route.ts` — GET score per tenant
- `src/app/api/security/snapshot/route.ts` — POST capture, GET history
- `src/app/dashboard/security/page.tsx` — Security page
- `src/components/security-dashboard.tsx` — Radar + checklist + trend
- New Graph API functions in `graph.ts` — getDirectoryRoles, getDirectoryRoleMembers

---

## Feature 6: Custom Fields (Tenants + Tasks)

### Problem
Tenants and tasks have fixed schemas. Admins need to track additional metadata (SLA level, contract expiry, risk level, etc.).

### Solution

#### New Models
```
CustomField: id, entityType("tenant"|"task"), fieldName, fieldType("text"|"number"|"date"|"select"),
             options(JSON), sortOrder Int, isRequired Bool, createdBy, createdAt

CustomFieldValue: id, fieldId FK, entityType, entityId String, value String, updatedBy, updatedAt
  @@unique([fieldId, entityType, entityId])
```

#### Field Types
| Type | Storage | Rendering |
|------|---------|-----------|
| `text` | Raw string | Text input |
| `number` | Numeric string | Number input |
| `date` | ISO date string | Date picker |
| `select` | Selected option | Dropdown from `options` JSON |

#### Admin UI
- `/dashboard/settings` → "Custom Fields" tab
- CRUD for field definitions (ADMIN only)
- Reorderable via sortOrder

#### Entity UI
- Tenant detail page: custom fields section below main info
- Task detail page: custom fields section
- Inline editing with save button

#### Search Integration
- Custom field values included in local search API

### Files
- `prisma/schema.prisma` — Add `CustomField`, `CustomFieldValue` models
- `src/app/dashboard/settings/custom-fields/` — Admin CRUD pages
- `src/components/custom-fields-editor.tsx` — Inline field value editor
- `src/components/custom-field-form.tsx` — Field definition form
- `src/app/api/custom-fields/route.ts` — CRUD API
- Server actions for custom field CRUD

---

## Feature 7: Favorites / Bookmarks

### Problem
No way to quick-access frequently used entities.

### Solution

#### New Model
```
Bookmark: id, userId FK, entityType String, entityId String, label String,
          metadata Json?, createdAt DateTime
  @@unique([userId, entityType, entityId])
  @@index([userId])
```

#### Supported Entity Types
| entityType | entityId format | label | metadata |
|------------|----------------|-------|----------|
| `tenant` | `"5"` (tenant DB id) | tenant name | `{abbrv}` |
| `task` | `"12"` (task DB id) | task name | `{taskCode}` |
| `runbook` | `"3"` (runbook DB id) | runbook title | `{category}` |
| `technician` | `"7"` (tech DB id) | display name | `{email}` |
| `ad_user` | `"tenantId:userId"` | display name | `{email, tenantAbbrv}` |
| `ad_group` | `"tenantId:groupId"` | display name | `{tenantAbbrv}` |

#### UI Components
- `BookmarkButton` — Star toggle, reusable across all entity detail views
- Dashboard "My Favorites" widget — Last 10 bookmarks grouped by type
- Sidebar "Favorites" section — Collapsible, shows top 5

#### API
- `/api/bookmarks` — GET (list user's), POST (create), DELETE (remove)
- Server actions for toggle

### Files
- `prisma/schema.prisma` — Add `Bookmark` model
- `src/components/bookmark-button.tsx` — Star toggle component
- `src/components/favorites-widget.tsx` — Dashboard widget
- `src/app/api/bookmarks/route.ts` — CRUD API
- Update sidebar to show favorites section
- Update dashboard page to include widget

---

## Feature 8: SSE Integration (Cross-cutting)

After all features are built, connect SSE events:
- Bookmark changes → refresh favorites widget
- Custom field updates → refresh detail pages
- Security snapshot captured → refresh security dashboard
- License optimization recalculated → refresh license page
- Search history → no SSE needed (local to user)

---

## New Prisma Models Summary

| Model | Table Name | Key Fields |
|-------|-----------|------------|
| `SearchHistory` | `tbmsearch_history` | userId, query, resultType, resultId, clickedLabel, timestamp |
| `SecuritySnapshot` | `tbmsecurity_snapshots` | tenantId, score, checksJson, capturedAt |
| `CustomField` | `tbmcustom_fields` | entityType, fieldName, fieldType, options, sortOrder |
| `CustomFieldValue` | `tbmcustom_field_values` | fieldId, entityType, entityId, value |
| `Bookmark` | `tbmbookmarks` | userId, entityType, entityId, label, metadata |

## Implementation Order

1. Notification Preference Enforcement (0 schema changes)
2. Favorites / Bookmarks (1 model)
3. Functional Global Search (1 model)
4. Real-time Updates SSE (0 models, infrastructure)
5. Custom Fields (2 models)
6. License Optimization (0 models, lib + API)
7. Compliance / Security Posture (1 model, heavy Graph API)
8. SSE Integration (connect everything)
