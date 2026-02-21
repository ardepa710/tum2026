# 8-Feature Batch 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 8 features to TUM2026: notification preference enforcement, bookmarks/favorites, enhanced global search, real-time SSE, custom fields, license optimization, compliance/security posture, and SSE cross-cutting integration.

**Architecture:** All features build on the existing Next.js 16 App Router with Prisma 7 + PostgreSQL (Neon.tech production, localhost dev). Server actions enforce RBAC via `requireRole()`. Client components use CSS variables for theming (dark/light). Graph API is queried via `src/lib/graph.ts` with client credentials flow per tenant. No test framework is configured — verification is via `npm run build` type checks + manual dev server testing.

**Tech Stack:** Next.js 16.1.6, TypeScript, Prisma 7, Tailwind CSS v4, Recharts, Lucide React, TanStack Table, Microsoft Graph API

**Branch:** `feat/8-feature-batch-2` (create from main)

**Design doc:** `docs/plans/2026-02-20-8-feature-batch-2-design.md`

---

## Task 0: Create feature branch

**Step 1: Create and switch to feature branch**

```bash
cd /home/ardepa/tum2026
git checkout -b feat/8-feature-batch-2
```

Expected: `Switched to a new branch 'feat/8-feature-batch-2'`

---

## Task 1: Notification Preference Enforcement

**Goal:** Make `createNotification()` respect user preferences before creating notifications. Zero schema changes.

**Files:**
- Modify: `src/lib/notify.ts`
- Modify: all files that call `createNotification()` (grep for callers)

**Step 1: Update `src/lib/notify.ts`**

Replace entire file with:

```typescript
import { prisma } from "@/lib/prisma";

type NotificationCategory = "task_run" | "task_fail" | "tech_sync" | "new_tenant";

const CATEGORY_TO_PREF = {
  task_run: "onTaskRun",
  task_fail: "onTaskFail",
  tech_sync: "onTechSync",
  new_tenant: "onNewTenant",
} as const;

/**
 * Fire-and-forget notification creation with preference enforcement.
 * If category is provided, checks user preferences before creating.
 * If category is null/undefined, always creates (backwards compatible).
 */
export function createNotification(params: {
  userId: string;
  title: string;
  body?: string;
  link?: string;
  category?: NotificationCategory;
}) {
  (async () => {
    if (params.category) {
      const prefField = CATEGORY_TO_PREF[params.category];
      const pref = await prisma.notificationPreference.findUnique({
        where: { userId: params.userId },
      });
      // If preference exists and category is disabled, skip
      if (pref && !pref[prefField]) return;
      // No pref record → defaults are all true → proceed
    }

    await prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        body: params.body ?? null,
        link: params.link ?? null,
      },
    });
  })().catch((err) => {
    console.error("Notification creation failed:", err);
  });
}
```

**Step 2: Find and update all callers**

Run: `grep -rn "createNotification(" src/ --include="*.ts" --include="*.tsx"`

For each caller, add the appropriate `category` parameter:
- If the call is related to a tenant being created → `category: "new_tenant"`
- If related to tech sync → `category: "tech_sync"`
- If related to task run start → `category: "task_run"`
- If related to task run failure → `category: "task_fail"`
- If unclear or general-purpose → leave `category` undefined (backwards compatible)

**Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds with no type errors.

**Step 4: Commit**

```bash
git add src/lib/notify.ts
git add -A
git commit -m "feat: enforce notification preferences in createNotification

Adds category parameter. Before inserting, checks user's
NotificationPreference and skips if category is disabled.
Backwards compatible — calls without category always create."
```

---

## Task 2: Prisma Schema Migration

**Goal:** Add all 5 new models in a single migration.

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add relations to User model**

In the `User` model in `prisma/schema.prisma`, add these two lines after the `notificationPref` relation:

```prisma
  searchHistory        SearchHistory[]
  bookmarks            Bookmark[]
```

**Step 2: Add relation to Tenant model**

In the `Tenant` model, add after `taskRuns`:

```prisma
  securitySnapshots    SecuritySnapshot[]
```

**Step 3: Add 5 new models**

Append after the `Runbook` model at the end of `prisma/schema.prisma`:

```prisma
model SearchHistory {
  id           Int      @id @default(autoincrement())
  userId       String   @map("user_id")
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  query        String
  resultType   String   @map("result_type")
  resultId     String   @map("result_id")
  clickedLabel String   @map("clicked_label")
  searchedAt   DateTime @default(now()) @map("searched_at")

  @@index([userId, searchedAt])
  @@map("tbmsearch_history")
}

model SecuritySnapshot {
  id         Int      @id @default(autoincrement())
  tenantId   Int      @map("tenant_id")
  tenant     Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  score      Int
  checksJson String   @map("checks_json") @db.Text
  capturedAt DateTime @default(now()) @map("captured_at")

  @@index([tenantId, capturedAt])
  @@map("tbmsecurity_snapshots")
}

model CustomField {
  id         Int                @id @default(autoincrement())
  entityType String             @map("entity_type")
  fieldName  String             @map("field_name")
  fieldType  String             @map("field_type")
  options    String?            @db.Text
  sortOrder  Int                @default(0) @map("sort_order")
  isRequired Boolean            @default(false) @map("is_required")
  createdBy  String             @map("created_by")
  createdAt  DateTime           @default(now()) @map("created_at")
  values     CustomFieldValue[]

  @@map("tbmcustom_fields")
}

model CustomFieldValue {
  id         Int         @id @default(autoincrement())
  fieldId    Int         @map("field_id")
  field      CustomField @relation(fields: [fieldId], references: [id], onDelete: Cascade)
  entityType String      @map("entity_type")
  entityId   String      @map("entity_id")
  value      String      @db.Text
  updatedBy  String      @map("updated_by")
  updatedAt  DateTime    @updatedAt @map("updated_at")

  @@unique([fieldId, entityType, entityId])
  @@index([entityType, entityId])
  @@map("tbmcustom_field_values")
}

model Bookmark {
  id         Int      @id @default(autoincrement())
  userId     String   @map("user_id")
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  entityType String   @map("entity_type")
  entityId   String   @map("entity_id")
  label      String
  metadata   String?  @db.Text
  createdAt  DateTime @default(now()) @map("created_at")

  @@unique([userId, entityType, entityId])
  @@index([userId])
  @@map("tbmbookmarks")
}
```

**Step 4: Run migration**

```bash
cd /home/ardepa/tum2026
npx prisma migrate dev --name add_search_security_customfields_bookmarks
```

Expected: Migration applies, Prisma client regenerated.

**Step 5: Verify build**

```bash
npm run build
```

**Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add SearchHistory, SecuritySnapshot, CustomField, CustomFieldValue, Bookmark models

Single migration for all 5 new tables supporting global search history,
security posture snapshots, custom fields, and bookmarks."
```

---

## Task 3: Favorites / Bookmarks

**Goal:** Bookmark toggle on entity detail views, API routes, dashboard widget, sidebar favorites.

**Files:**
- Create: `src/app/api/bookmarks/route.ts`
- Create: `src/components/bookmark-button.tsx`
- Create: `src/components/favorites-widget.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/components/layout/sidebar.tsx`
- Modify: entity detail pages (tenants/[id], tasks/[id], runbooks/[id], technicians/[id])
- Modify: `src/components/user-detail-panel.tsx`
- Modify: `src/components/group-detail-panel.tsx`

**Step 1: Create API route `src/app/api/bookmarks/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json([], { status: 401 });

  const limit = Number(req.nextUrl.searchParams.get("limit")) || 20;
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(bookmarks);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { entityType, entityId, label, metadata } = await req.json();
  if (!entityType || !entityId || !label) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const bookmark = await prisma.bookmark.upsert({
    where: {
      userId_entityType_entityId: {
        userId: session.user.id,
        entityType,
        entityId: String(entityId),
      },
    },
    update: { label, metadata: metadata ? JSON.stringify(metadata) : null },
    create: {
      userId: session.user.id,
      entityType,
      entityId: String(entityId),
      label,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });

  return NextResponse.json(bookmark);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entityType = req.nextUrl.searchParams.get("entityType");
  const entityId = req.nextUrl.searchParams.get("entityId");
  if (!entityType || !entityId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  await prisma.bookmark.deleteMany({
    where: { userId: session.user.id, entityType, entityId },
  });

  return NextResponse.json({ ok: true });
}
```

**Step 2: Create `src/components/bookmark-button.tsx`**

Client component with star icon toggle. On mount, checks if entity is bookmarked via GET `/api/bookmarks?limit=100`. On click, POST to create or DELETE to remove.

Props: `entityType: string`, `entityId: string`, `label: string`, `metadata?: Record<string, unknown>`, `className?: string`

Visual: `Star` icon from lucide-react. When bookmarked: filled yellow (`fill-[var(--warning)] text-[var(--warning)]`). When not: outline muted (`text-[var(--text-muted)]`).

**Step 3: Create `src/components/favorites-widget.tsx`**

Client component for dashboard. Fetches `/api/bookmarks?limit=10` on mount. Groups by entityType. Each item shows:
- Icon per type (Building2 for tenant, Cog for task, BookOpen for runbook, Wrench for technician, User for ad_user, UsersRound for ad_group)
- Label text
- Click navigates to entity detail page

Mapping for navigation:
- `tenant` → `/dashboard/tenants/${entityId}`
- `task` → `/dashboard/tasks/${entityId}`
- `runbook` → `/dashboard/runbooks/${entityId}`
- `technician` → `/dashboard/technicians/${entityId}`
- `ad_user` → `/dashboard/users?tenant=${tenantId}&search=${label}` (parse tenantId from entityId "tenantId:userId")
- `ad_group` → `/dashboard/groups?tenant=${tenantId}&search=${label}`

Empty state: Star icon + "No favorites yet. Star items to see them here."

**Step 4: Add favorites widget to `src/app/dashboard/page.tsx`**

Import `FavoritesWidget`. Add it in the two-column layout, replacing or adding alongside Quick Actions:
- If user is EDITOR+: show Quick Actions + Favorites widget (stacked)
- If user is VIEWER: show only Favorites widget

**Step 5: Add favorites section to sidebar**

In `src/components/layout/sidebar.tsx`:
- Import `Star` from lucide-react
- Add a "Favorites" collapsible section between nav items and the sign-out button
- Fetch `/api/bookmarks?limit=5` on mount (client component, already "use client")
- Render as compact links: star icon + label, truncated
- Collapsible: click "Favorites" header to expand/collapse
- Use `useState` for collapsed state, default collapsed

**Step 6: Add BookmarkButton to entity detail pages**

For each detail page, add `<BookmarkButton>` next to the page title/header area:

- `src/app/dashboard/tenants/[id]/page.tsx`: Read file first, find the header `<h2>` with tenant name. Add `<BookmarkButton entityType="tenant" entityId={String(tenant.id)} label={tenant.tenantName} metadata={{ abbrv: tenant.tenantAbbrv }} />` next to it. Since page is server component, wrap in a `<div className="flex items-center gap-2">` with the title.

- `src/app/dashboard/tasks/[id]/page.tsx`: Same pattern, `entityType="task"`, `label={task.taskName}`, `metadata={{ taskCode: task.taskCode }}`

- `src/app/dashboard/runbooks/[id]/page.tsx`: `entityType="runbook"`, `label={runbook.title}`, `metadata={{ category: runbook.category }}`

- `src/app/dashboard/technicians/[id]/page.tsx`: `entityType="technician"`, `label={tech.displayName}`, `metadata={{ email: tech.email }}`

- `src/components/user-detail-panel.tsx`: `entityType="ad_user"`, `entityId="{tenantId}:{userId}"`, `label={user.displayName}`, `metadata={{ email: user.mail, tenantAbbrv }}`

- `src/components/group-detail-panel.tsx`: `entityType="ad_group"`, `entityId="{tenantId}:{groupId}"`, `label={group.displayName}`, `metadata={{ tenantAbbrv }}`

**Step 7: Verify build**

```bash
npm run build
```

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: add bookmarks/favorites system

BookmarkButton toggle for all entity types. API routes for CRUD.
Dashboard FavoritesWidget showing recent bookmarks grouped by type.
Sidebar favorites section with top 5 bookmarked items."
```

---

## Task 4: Enhanced Global Search

**Goal:** Add search history, type filters, and quick actions to GlobalSearch.

**Files:**
- Create: `src/app/api/search/history/route.ts`
- Modify: `src/components/global-search.tsx`

**Step 1: Create search history API**

`src/app/api/search/history/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET — last 5 unique recent searches
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json([]);

  const history = await prisma.searchHistory.findMany({
    where: { userId: session.user.id },
    orderBy: { searchedAt: "desc" },
    take: 10,
    distinct: ["resultType", "resultId"],
  });

  // Deduplicate by resultType+resultId, keep first 5
  const seen = new Set<string>();
  const unique = [];
  for (const h of history) {
    const key = `${h.resultType}:${h.resultId}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(h);
    }
    if (unique.length >= 5) break;
  }

  return NextResponse.json(unique);
}

// POST — save a search entry
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { query, resultType, resultId, clickedLabel } = await req.json();
  if (!query || !resultType || !resultId || !clickedLabel) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await prisma.searchHistory.create({
    data: {
      userId: session.user.id,
      query,
      resultType,
      resultId: String(resultId),
      clickedLabel,
    },
  });

  return NextResponse.json({ ok: true });
}

// DELETE — clear all history
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.searchHistory.deleteMany({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
```

**Step 2: Enhance `src/components/global-search.tsx`**

Add three features to the existing component:

**A) Recent searches:**
- New state: `recentSearches` array
- On focus with empty query: fetch `/api/search/history`, show in dropdown
- Each recent item: icon per type + clickedLabel + small "x" to remove
- Clicking navigates (same as regular result)

**B) Type filter chips:**
- New state: `activeFilter: "all" | "tenant" | "task" | "technician" | "runbook" | "user"`
- Render chip row above results in dropdown
- Filter `flat` array: `const filtered = activeFilter === "all" ? flat : flat.filter(i => i.type === activeFilter)`
- Style: pill buttons, active = accent bg, inactive = bg-hover

**C) Quick actions:**
- On the currently highlighted/hovered result, show 1-2 small action buttons on the right
- Actions per type:
  - `tenant`: "Users" button → `/dashboard/tenants/{id}/users`
  - `task`: "Runs" button → `/dashboard/runs`
  - `runbook`: "Edit" button → `/dashboard/runbooks/{id}/edit` (conditionally, based on role prop)
  - `user`: passed through, no extra action needed (already navigates to user panel)
  - `technician`: no extra action
- Actions rendered as small pill buttons with lucide icons

**D) Save on click:**
- In `handleSelect()`, after navigation, POST to `/api/search/history` (fire-and-forget)

**Step 3: Pass role prop to GlobalSearch**

The `GlobalSearch` component is rendered in `src/components/layout/header.tsx`. Update header to pass the user's role so that search can conditionally show "Edit" action for runbooks.

**Step 4: Verify build**

```bash
npm run build
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: enhance global search with history, filters, and quick actions

Recent searches on focus (last 5). Type filter chips. Contextual quick
action buttons per result type. History persisted in DB per user."
```

---

## Task 5: Real-time Updates (SSE)

**Goal:** SSE infrastructure with event bus, streaming endpoint, client hook. NotificationBell uses SSE.

**Files:**
- Create: `src/lib/sse.ts`
- Create: `src/app/api/sse/events/route.ts`
- Create: `src/hooks/use-sse.ts`
- Modify: `src/components/notification-bell.tsx`
- Modify: `src/lib/notify.ts`

**Step 1: Create `src/lib/sse.ts`**

```typescript
// In-memory SSE event bus.
// On Vercel Serverless: each invocation is isolated, so events only
// reach clients on the same instance. SSE auto-reconnects, and
// client re-fetches state on reconnection. Acceptable trade-off
// for zero-infrastructure real-time.

type SSEListener = (event: string, data: string) => void;

const listeners = new Map<string, Set<SSEListener>>();

export function addListener(userId: string, listener: SSEListener) {
  if (!listeners.has(userId)) listeners.set(userId, new Set());
  listeners.get(userId)!.add(listener);
}

export function removeListener(userId: string, listener: SSEListener) {
  listeners.get(userId)?.delete(listener);
  if (listeners.get(userId)?.size === 0) listeners.delete(userId);
}

export function emitEvent(userId: string, eventType: string, payload: unknown) {
  const userListeners = listeners.get(userId);
  if (!userListeners) return;
  const data = JSON.stringify(payload);
  for (const listener of userListeners) {
    try { listener(eventType, data); } catch {}
  }
}

export function broadcastEvent(eventType: string, payload: unknown) {
  const data = JSON.stringify(payload);
  for (const userListeners of listeners.values()) {
    for (const listener of userListeners) {
      try { listener(eventType, data); } catch {}
    }
  }
}
```

**Step 2: Create `src/app/api/sse/events/route.ts`**

```typescript
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { addListener, removeListener } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`event: connected\ndata: {}\n\n`));

      // Heartbeat every 15s
      const heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(`: heartbeat\n\n`)); } catch { clearInterval(heartbeat); }
      }, 15000);

      const listener = (event: string, data: string) => {
        try { controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`)); } catch {}
      };

      addListener(userId, listener);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        removeListener(userId, listener);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
```

**Step 3: Create `src/hooks/use-sse.ts`**

```typescript
"use client";

import { useEffect, useRef, useCallback } from "react";

type SSEHandler = (data: unknown) => void;

export function useSSE(handlers: Record<string, SSEHandler>) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const connect = useCallback(() => {
    const es = new EventSource("/api/sse/events");

    for (const eventType of Object.keys(handlersRef.current)) {
      es.addEventListener(eventType, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          handlersRef.current[eventType]?.(data);
        } catch {}
      });
    }

    es.onerror = () => {
      es.close();
      setTimeout(connect, 5000);
    };

    return es;
  }, []);

  useEffect(() => {
    const es = connect();
    return () => es.close();
  }, [connect]);
}
```

**Step 4: Update `src/components/notification-bell.tsx`**

- Import `useSSE` from `@/hooks/use-sse`
- Add SSE handler for `notification` event type:
  ```typescript
  useSSE({
    notification: (data) => {
      const notif = data as Notification;
      setNotifications((prev) => [notif, ...prev].slice(0, 10));
      setUnreadCount((prev) => prev + 1);
    },
  });
  ```
- Change polling interval from 30s to 60s (SSE handles real-time, polling is fallback)

**Step 5: Update `src/lib/notify.ts`**

After the successful `prisma.notification.create()` call, emit SSE event:

```typescript
import { emitEvent } from "@/lib/sse";

// After creating notification:
emitEvent(params.userId, "notification", {
  id: created.id,
  title: params.title,
  body: params.body ?? null,
  link: params.link ?? null,
  isRead: false,
  createdAt: created.createdAt.toISOString(),
});
```

Note: Need to capture the created notification's id and createdAt, so change from fire-and-forget to awaiting the create.

**Step 6: Verify build**

```bash
npm run build
```

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Server-Sent Events for real-time updates

Event bus (sse.ts), streaming endpoint (/api/sse/events), client hook
(useSSE). NotificationBell uses SSE with 60s polling fallback. Emits
notification events on creation."
```

---

## Task 6: Custom Fields (Tenants + Tasks)

**Goal:** Admin-defined custom fields with inline editing on entity detail pages.

**Files:**
- Create: `src/app/dashboard/settings/custom-fields/page.tsx`
- Create: `src/app/dashboard/settings/custom-fields/actions.ts`
- Create: `src/components/custom-field-form.tsx`
- Create: `src/components/custom-fields-editor.tsx`
- Create: `src/app/api/custom-fields/route.ts`
- Create: `src/app/api/custom-fields/values/route.ts`
- Modify: `src/app/dashboard/settings/page.tsx`
- Modify: `src/app/dashboard/tenants/[id]/page.tsx`
- Modify: `src/app/dashboard/tasks/[id]/page.tsx`

**Step 1: Create server actions `src/app/dashboard/settings/custom-fields/actions.ts`**

```typescript
"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit, getActor } from "@/lib/audit";
import { redirect } from "next/navigation";

export async function createCustomField(
  _prevState: { error: string },
  formData: FormData
) {
  await requireRole("ADMIN");
  const actor = await getActor();

  const entityType = (formData.get("entityType") as string)?.trim();
  const fieldName = (formData.get("fieldName") as string)?.trim();
  const fieldType = (formData.get("fieldType") as string)?.trim();
  const options = (formData.get("options") as string)?.trim() || null;
  const isRequired = formData.get("isRequired") === "true";

  if (!entityType || !fieldName || !fieldType) {
    return { error: "Entity type, field name, and field type are required." };
  }
  if (!["tenant", "task"].includes(entityType)) {
    return { error: "Entity type must be 'tenant' or 'task'." };
  }
  if (!["text", "number", "date", "select"].includes(fieldType)) {
    return { error: "Invalid field type." };
  }
  if (fieldType === "select" && !options) {
    return { error: "Select fields require options (comma-separated)." };
  }

  const maxSort = await prisma.customField.aggregate({
    where: { entityType },
    _max: { sortOrder: true },
  });

  const field = await prisma.customField.create({
    data: {
      entityType, fieldName, fieldType, options, isRequired,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      createdBy: actor,
    },
  });

  logAudit({ actor, action: "CREATE", entity: "CUSTOM_FIELD", entityId: field.id, details: { fieldName, entityType, fieldType } });
  redirect("/dashboard/settings/custom-fields");
}

export async function deleteCustomField(id: number) {
  await requireRole("ADMIN");
  const actor = await getActor();
  await prisma.customField.delete({ where: { id } });
  logAudit({ actor, action: "DELETE", entity: "CUSTOM_FIELD", entityId: id });
  redirect("/dashboard/settings/custom-fields");
}
```

**Step 2: Create API route for field definitions `src/app/api/custom-fields/route.ts`**

- GET `?entityType=tenant` → returns all field definitions for that entity type, ordered by sortOrder

**Step 3: Create API route for field values `src/app/api/custom-fields/values/route.ts`**

- GET `?entityType=tenant&entityId=5` → returns field definitions + values joined
- PUT body `{ fieldId, entityType, entityId, value }` → upsert value

**Step 4: Create `src/components/custom-field-form.tsx`**

Form component for creating a custom field definition. Uses `useActionState` with `createCustomField` server action.

Fields:
- Entity Type: dropdown (Tenant, Task)
- Field Name: text input
- Field Type: dropdown (Text, Number, Date, Select)
- Options: textarea (only shown when fieldType is "select"), comma-separated
- Required: checkbox

Style: Same card-based form pattern used in `tenant-form.tsx` and `master-task-form.tsx`.

**Step 5: Create `src/components/custom-fields-editor.tsx`**

Client component for inline editing of custom field values on entity detail pages.

Props: `entityType: string`, `entityId: string`

Behavior:
1. On mount, GET `/api/custom-fields/values?entityType={entityType}&entityId={entityId}`
2. Render each field with appropriate input based on fieldType:
   - `text` → `<input type="text">`
   - `number` → `<input type="number">`
   - `date` → `<input type="date">`
   - `select` → `<select>` with options parsed from comma-separated string
3. "Save" button per field or "Save All" button
4. On save, PUT to `/api/custom-fields/values`
5. Success: green checkmark feedback. Error: red message.

Style: Section card with "Custom Fields" header, same styling as other detail page sections.

**Step 6: Create admin page `src/app/dashboard/settings/custom-fields/page.tsx`**

Server component:
- `requireRole("ADMIN")` at top
- Fetch all custom fields grouped by entityType
- Render two sections: "Tenant Fields" and "Task Fields"
- Each field shows: name, type, required badge, options (for select), delete button
- "Add Field" section with `<CustomFieldForm />`

**Step 7: Add link in settings page**

In `src/app/dashboard/settings/page.tsx`:
- Import `SlidersHorizontal` from lucide-react
- Add a new card section between "Notification Preferences" and "About":

```tsx
{/* Custom Fields Section — ADMIN only */}
{role === "ADMIN" && (
  <Link href="/dashboard/settings/custom-fields" className="block bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 hover:border-[var(--accent)] transition-colors">
    <div className="flex items-center gap-2 mb-2">
      <SlidersHorizontal className="w-5 h-5 text-[var(--accent)]" />
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">Custom Fields</h3>
    </div>
    <p className="text-sm text-[var(--text-secondary)]">
      Define custom fields for tenants and tasks
    </p>
  </Link>
)}
```

Note: Settings page is a server component, so fetch role via `getSessionRole()`.

**Step 8: Add custom fields to tenant detail**

In `src/app/dashboard/tenants/[id]/page.tsx`:
- Import `CustomFieldsEditor`
- Add `<CustomFieldsEditor entityType="tenant" entityId={String(tenant.id)} />` as a new section card below existing content

**Step 9: Add custom fields to task detail**

In `src/app/dashboard/tasks/[id]/page.tsx`:
- Same as above with `entityType="task"`

**Step 10: Verify build**

```bash
npm run build
```

**Step 11: Commit**

```bash
git add -A
git commit -m "feat: add custom fields for tenants and tasks

Admin-defined fields (text/number/date/select) via settings page.
Inline editing on tenant and task detail pages. API routes for
field definitions and values. Audit logged."
```

---

## Task 7: License Optimization

**Goal:** Waste detection, savings estimation, and optimization recommendations for M365 licenses.

**Files:**
- Create: `src/lib/license-optimizer.ts`
- Create: `src/lib/types/license-optimization.ts`
- Create: `src/app/api/licenses/optimization/route.ts`
- Modify: `src/components/license-dashboard.tsx`
- Modify: `src/app/dashboard/licenses/page.tsx` (if needed to pass tenant data)

**Step 1: Create types `src/lib/types/license-optimization.ts`**

```typescript
export interface SkuPriceEntry {
  skuPartNumber: string;
  friendlyName: string;
  monthlyPricePerUser: number;
}

export interface LicenseRecommendation {
  tenantAbbrv: string;
  tenantId: number;
  skuPartNumber: string;
  friendlyName: string;
  totalEnabled: number;
  totalConsumed: number;
  unusedCount: number;
  utilizationPct: number;
  estimatedWastePerMonth: number;
  severity: "optimized" | "review" | "wasteful";
  recommendation: string;
}

export interface OptimizationSummary {
  totalEstimatedWaste: number;
  recommendations: LicenseRecommendation[];
  analyzedTenants: number;
  analyzedSkus: number;
}
```

**Step 2: Create optimizer engine `src/lib/license-optimizer.ts`**

Contains:
- `SKU_PRICES`: Map of ~20 common M365 SKU part numbers to estimated monthly per-user prices (USD). Examples:
  - `ENTERPRISEPACK` (E3) → $36
  - `SPE_E5` (E5) → $57
  - `O365_BUSINESS_ESSENTIALS` → $6
  - `O365_BUSINESS_PREMIUM` → $22
  - `EXCHANGESTANDARD` → $4
  - `FLOW_FREE` → $0 (skip free SKUs)
  - etc.
- `formatSkuName(skuPartNumber)`: human-readable name from SKU_PRICES or fallback
- `analyzeOptimization(tenants)`: async function
  - For each tenant, call `getLicenses(tenantId)` from `src/lib/graph.ts`
  - For each license, compute utilization
  - Generate recommendation if utilization < 80%
  - severity: < 50% → "wasteful", < 80% → "review", >= 80% → "optimized"
  - recommendation text: "X unused licenses (~$Y/mo waste). Consider reducing allocation."
  - Return `OptimizationSummary`
- In-memory cache with 1hr TTL

**Step 3: Create API route `src/app/api/licenses/optimization/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeOptimization } from "@/lib/license-optimizer";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenants = await prisma.tenant.findMany({
    select: { id: true, tenantAbbrv: true, tenantIdMsft: true },
  });

  const summary = await analyzeOptimization(tenants);
  return NextResponse.json(summary);
}
```

**Step 4: Add optimization section to `src/components/license-dashboard.tsx`**

Above the existing SKU grid, add a collapsible "License Optimization" section:

1. On mount, fetch `/api/licenses/optimization`
2. Show summary card:
   - "Estimated monthly waste: $XXX"
   - "X recommendations across Y tenants"
   - Color-coded: green if < $50, yellow if < $200, red if >= $200
3. Below summary, list recommendations:
   - Each as a card with: tenant badge, SKU name, bar showing utilization %, unused count, estimated waste
   - Severity badge: green/yellow/red pill
   - Recommendation text

**Step 5: Verify build**

```bash
npm run build
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add license optimization with waste detection and savings estimates

SKU price map for top 20 M365 licenses. Utilization analysis across
tenants. Recommendations with severity badges and monthly cost estimates.
Integrated into license dashboard."
```

---

## Task 8: Compliance / Security Posture

**Goal:** Security score, compliance checklist, snapshot history, radar chart, trend line, dedicated page.

**Files:**
- Create: `src/lib/security-score.ts`
- Create: `src/lib/compliance-checks.ts`
- Create: `src/lib/types/security.ts`
- Create: `src/app/api/security/score/route.ts`
- Create: `src/app/api/security/snapshot/route.ts`
- Create: `src/app/dashboard/security/page.tsx`
- Create: `src/components/security-dashboard.tsx`
- Modify: `src/lib/graph.ts` — Add getDirectoryRoles, getDirectoryRoleMembers
- Modify: `src/components/layout/sidebar.tsx` — Add Security nav item

**Step 1: Add Graph API functions to `src/lib/graph.ts`**

Add two new exported functions:

```typescript
export async function getDirectoryRoles(tenantId: number) {
  const client = await getGraphClient(tenantId);
  if (!client) return [];
  try {
    const response = await client
      .api("/directoryRoles")
      .select("id,displayName,roleTemplateId")
      .get();
    return response.value;
  } catch { return []; }
}

export async function getDirectoryRoleMembers(tenantId: number, roleId: string) {
  const client = await getGraphClient(tenantId);
  if (!client) return [];
  try {
    const response = await client
      .api(`/directoryRoles/${roleId}/members`)
      .select("id,displayName,mail,userPrincipalName")
      .top(999)
      .get();
    return response.value;
  } catch { return []; }
}
```

**Step 2: Create types `src/lib/types/security.ts`**

```typescript
export interface SecurityCheck {
  id: string;
  name: string;
  description: string;
  category: string;
  weight: number;
  status: "pass" | "fail" | "warning";
  score: number;
  details?: string;
}

export interface SecurityScoreResult {
  tenantId: number;
  tenantAbbrv: string;
  totalScore: number;
  checks: SecurityCheck[];
}

export interface SecuritySnapshotData {
  id: number;
  score: number;
  capturedAt: string;
}
```

**Step 3: Create security score engine `src/lib/security-score.ts`**

```typescript
import { getUsers, getConditionalAccessPolicies, getDirectoryRoles, getDirectoryRoleMembers } from "@/lib/graph";
import type { SecurityCheck, SecurityScoreResult } from "@/lib/types/security";

const scoreCache = new Map<number, { result: SecurityScoreResult; expiresAt: number }>();
const CACHE_TTL = 3600000;

// Global Admin role template ID (constant across all tenants)
const GLOBAL_ADMIN_ROLE_TEMPLATE = "62e90394-69f5-4237-9190-012177145e10";

export async function calculateSecurityScore(
  tenantId: number,
  tenantAbbrv: string
): Promise<SecurityScoreResult> {
  const cached = scoreCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  const checks: SecurityCheck[] = [];

  // Run checks in parallel
  const [users, policies, roles] = await Promise.allSettled([
    getUsers(tenantId),
    getConditionalAccessPolicies(tenantId),
    getDirectoryRoles(tenantId),
  ]);

  const userList = users.status === "fulfilled" ? users.value : [];
  const policyList = policies.status === "fulfilled" ? policies.value : [];
  const roleList = roles.status === "fulfilled" ? roles.value : [];

  // Check 1: CA policies (weight 25)
  const activePolicies = policyList.filter((p: any) => p.state === "enabled");
  const caScore = Math.min(activePolicies.length * 8, 25);
  checks.push({
    id: "ca_policies",
    name: "Conditional Access Policies",
    description: "Active CA policies protect against unauthorized access",
    category: "Access Control",
    weight: 25,
    status: activePolicies.length >= 3 ? "pass" : activePolicies.length >= 1 ? "warning" : "fail",
    score: caScore,
    details: `${activePolicies.length} active CA policies`,
  });

  // Check 2: Global Admin count (weight 20)
  const gaRole = roleList.find((r: any) => r.roleTemplateId === GLOBAL_ADMIN_ROLE_TEMPLATE);
  let gaCount = 0;
  if (gaRole) {
    const members = await getDirectoryRoleMembers(tenantId, gaRole.id);
    gaCount = members.length;
  }
  const gaScore = gaCount <= 5 ? 20 : gaCount <= 8 ? 12 : 5;
  checks.push({
    id: "global_admins",
    name: "Global Administrator Count",
    description: "Fewer Global Admins reduces attack surface",
    category: "Privileged Access",
    weight: 20,
    status: gaCount <= 5 ? "pass" : gaCount <= 8 ? "warning" : "fail",
    score: gaScore,
    details: `${gaCount} Global Admins`,
  });

  // Check 3: Disabled accounts ratio (weight 15)
  const totalUsers = userList.length || 1;
  const disabledCount = userList.filter((u: any) => !u.accountEnabled).length;
  const disabledRatio = disabledCount / totalUsers;
  const disabledScore = disabledRatio < 0.2 ? 15 : disabledRatio < 0.4 ? 10 : 5;
  checks.push({
    id: "disabled_ratio",
    name: "Disabled Accounts Ratio",
    description: "High ratio of disabled accounts may indicate stale accounts",
    category: "Account Hygiene",
    weight: 15,
    status: disabledRatio < 0.2 ? "pass" : disabledRatio < 0.4 ? "warning" : "fail",
    score: disabledScore,
    details: `${disabledCount}/${totalUsers} disabled (${Math.round(disabledRatio * 100)}%)`,
  });

  // Check 4: Guest user ratio (weight 15)
  const guestCount = userList.filter((u: any) => u.userPrincipalName?.includes("#EXT#")).length;
  const guestRatio = guestCount / totalUsers;
  const guestScore = guestRatio < 0.3 ? 15 : guestRatio < 0.5 ? 10 : 5;
  checks.push({
    id: "guest_ratio",
    name: "Guest User Ratio",
    description: "High guest count increases external access risk",
    category: "External Access",
    weight: 15,
    status: guestRatio < 0.3 ? "pass" : guestRatio < 0.5 ? "warning" : "fail",
    score: guestScore,
    details: `${guestCount} guests (${Math.round(guestRatio * 100)}%)`,
  });

  // Check 5: MFA enforcement via CA (weight 10)
  const mfaPolicies = activePolicies.filter((p: any) =>
    p.grantControls?.builtInControls?.includes("mfa")
  );
  const mfaScore = mfaPolicies.length > 0 ? 10 : 0;
  checks.push({
    id: "mfa_enforcement",
    name: "MFA Enforcement",
    description: "MFA should be enforced via Conditional Access",
    category: "Authentication",
    weight: 10,
    status: mfaPolicies.length > 0 ? "pass" : "fail",
    score: mfaScore,
    details: `${mfaPolicies.length} CA policies enforce MFA`,
  });

  // Check 6: Security baseline (weight 15)
  const hasSecurityBaseline = policyList.length > 0;
  const baselineScore = hasSecurityBaseline ? 15 : 0;
  checks.push({
    id: "security_baseline",
    name: "Security Baseline",
    description: "At least one CA policy should exist as security baseline",
    category: "Baseline",
    weight: 15,
    status: hasSecurityBaseline ? "pass" : "fail",
    score: baselineScore,
    details: hasSecurityBaseline ? "CA policies configured" : "No CA policies found",
  });

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const result: SecurityScoreResult = { tenantId, tenantAbbrv, totalScore, checks };

  scoreCache.set(tenantId, { result, expiresAt: Date.now() + CACHE_TTL });
  return result;
}
```

**Step 4: Create compliance checks engine `src/lib/compliance-checks.ts`**

Similar structure but returns pass/fail/warning per check. Reuses same Graph API data. Can call `calculateSecurityScore` and extract checks, or run independently.

Key checks:
- Has active CA policies → pass if count > 0
- Global Admins <= 5 → pass/fail
- Has break-glass account → pass if any user displayName matches "break" or "emergency" (case-insensitive)
- MFA enforced → pass if any CA policy has MFA grant control
- Guest access controlled → pass if guest ratio < 30%

**Step 5: Create API routes**

`src/app/api/security/score/route.ts`:
- GET `?tenantId=5` → score for one tenant
- GET (no param) → scores for all tenants

`src/app/api/security/snapshot/route.ts`:
- POST `{ tenantId }` → ADMIN only, captures and stores snapshot
- GET `?tenantId=5&days=30` → returns snapshot history

**Step 6: Create `src/components/security-dashboard.tsx`**

Client component. Props: `tenants: { id: number; tenantAbbrv: string }[]`

Sections:
1. **Tenant selector dropdown** → loads score for selected tenant
2. **Score card** with health-badge style (green >= 80, yellow >= 50, red < 50)
3. **Radar chart** (Recharts RadarChart): categories on axes (Access Control, Privileged Access, Account Hygiene, External Access, Authentication, Baseline), values = check scores normalized to 0-100%
4. **Compliance checklist** table: check name, status badge (pass/fail/warning), score/weight, details
5. **Trend chart** (Recharts LineChart): from snapshot history, X=date, Y=score
6. **"Capture Snapshot" button**: ADMIN only, POST to snapshot API, refreshes trend chart

**Step 7: Create page `src/app/dashboard/security/page.tsx`**

```typescript
import { prisma } from "@/lib/prisma";
import { SecurityDashboard } from "@/components/security-dashboard";
import { requireRole } from "@/lib/rbac";
import { Shield } from "lucide-react";

export default async function SecurityPage() {
  await requireRole("VIEWER");
  const tenants = await prisma.tenant.findMany({
    select: { id: true, tenantAbbrv: true },
    orderBy: { tenantAbbrv: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Security Posture</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Compliance checks and security scoring across tenants
          </p>
        </div>
        <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
          <Shield className="w-5 h-5" style={{ color: "var(--accent)" }} />
        </div>
      </div>
      <SecurityDashboard tenants={tenants} />
    </div>
  );
}
```

**Step 8: Add Security to sidebar nav**

In `src/components/layout/sidebar.tsx`, add to `navItems` array after "Service Health":

```typescript
{ href: "/dashboard/security", label: "Security", icon: Shield },
```

Make sure `Shield` is already imported from lucide-react (it is in the existing imports).

**Step 9: Verify build**

```bash
npm run build
```

**Step 10: Commit**

```bash
git add -A
git commit -m "feat: add compliance/security posture dashboard

Security score engine (0-100) with 6 Graph API checks. Compliance
checklist. Snapshot history for trend tracking. Radar chart + line
chart. New /dashboard/security page."
```

---

## Task 9: SSE Cross-cutting Integration

**Goal:** Connect SSE events to all new features.

**Files:**
- Modify: `src/app/dashboard/tenants/new/actions.ts` — broadcast on create
- Modify: `src/app/dashboard/technicians/actions.ts` — broadcast on sync
- Modify: `src/app/dashboard/settings/custom-fields/actions.ts` — broadcast on field change
- Modify: `src/app/api/security/snapshot/route.ts` — broadcast on capture
- Modify: `src/components/favorites-widget.tsx` — listen for updates
- Modify: `src/components/alert-banner.tsx` — listen for alerts

**Step 1: Add SSE broadcasts to server actions**

In each server action that modifies shared state, import `broadcastEvent` from `@/lib/sse` and emit after the mutation:

- `createTenant`: `broadcastEvent("tenant-update", { action: "create", tenantId: newTenant.id })`
- `deleteTenant`: `broadcastEvent("tenant-update", { action: "delete", tenantId: id })`
- `syncTechnicians`: `broadcastEvent("tech-sync", { count: syncedCount })`
- `createCustomField`: `broadcastEvent("custom-field-update", { entityType, fieldId: field.id })`
- Security snapshot POST: `broadcastEvent("security-snapshot", { tenantId, score })`

**Step 2: Add SSE listeners to client components**

In each relevant client component, add `useSSE` hook:

```typescript
// favorites-widget.tsx
useSSE({
  "bookmark-update": () => fetchBookmarks(), // re-fetch on any bookmark change
});

// alert-banner.tsx
useSSE({
  alert: () => fetchAlertCount(), // re-fetch alert count
});
```

For bookmark changes, also emit in the bookmark API route:
- POST `/api/bookmarks`: after upsert, call `emitEvent(userId, "bookmark-update", bookmark)` (need to import `emitEvent`)
- DELETE `/api/bookmarks`: after delete, call `emitEvent(userId, "bookmark-update", { deleted: true })`

**Step 3: Verify build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: connect SSE events across all new features

Server actions broadcast on tenant/tech/custom-field/security changes.
Client components subscribe via useSSE for real-time updates."
```

---

## Task 10: Final verification and memory update

**Step 1: Full build**

```bash
cd /home/ardepa/tum2026
npm run build
```

Expected: Build succeeds, all pages compile.

**Step 2: Start dev server and verify**

```bash
npm run dev
```

Open https://192.168.1.48:3000 and verify:
- [ ] Notification bell receives SSE events
- [ ] Bookmarks toggle on tenant/task/runbook/technician detail pages
- [ ] Favorites widget on dashboard shows bookmarked items
- [ ] Sidebar shows favorites section
- [ ] Global search shows recent searches on focus
- [ ] Global search type filter chips work
- [ ] Quick action buttons appear on search results
- [ ] Custom fields section on settings page (ADMIN only)
- [ ] Custom fields editor on tenant/task detail pages
- [ ] License optimization section on license dashboard
- [ ] Security page loads with score cards
- [ ] Security radar chart renders
- [ ] Security compliance checklist shows pass/fail
- [ ] Capture snapshot button works (ADMIN)
- [ ] Sidebar has "Security" nav item

**Step 3: Apply migration to production**

```bash
DATABASE_URL="<neon_url>" npx prisma migrate deploy
```

**Step 4: Update memory file**

Update `/home/ardepa/.claude/projects/-home-ardepa/memory/tum2026.md` with:
- 5 new models: SearchHistory, SecuritySnapshot, CustomField, CustomFieldValue, Bookmark
- New pages: /dashboard/security
- New lib files: sse.ts, security-score.ts, compliance-checks.ts, license-optimizer.ts
- New hooks: use-sse.ts
- New API routes: /api/bookmarks, /api/search/history, /api/sse/events, /api/custom-fields, /api/custom-fields/values, /api/security/score, /api/security/snapshot, /api/licenses/optimization
- Sidebar now has 16 nav items (added Security)
- SSE architecture notes
- NotificationBell uses SSE + 60s polling fallback
- Notification preferences are now enforced

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final verification for 8-feature batch 2"
```
