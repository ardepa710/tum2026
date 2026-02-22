# Sophos Central Integration + NinjaOne Cross-Link — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate Sophos Central API for endpoint security monitoring with cross-link to NinjaOne devices, adding a new "Security" sidebar group.

**Architecture:** Partner credentials OAuth2 → whoami discovery → per-tenant API calls with X-Tenant-ID header and regional apiHost. Cross-links match NinjaOne devices to Sophos endpoints by hostname within the same TUM tenant.

**Tech Stack:** Next.js 16 (App Router), Prisma 7, TypeScript, Tailwind CSS v4, Sophos Central REST API (OAuth2 Client Credentials)

**Design doc:** `docs/plans/2026-02-22-sophos-integration-design.md`

---

## Task 1: Database Migration

**Files:**
- Modify: `prisma/schema.prisma:87-104` (Tenant model)
- Modify: `prisma/schema.prisma:346` (after DeviceAssignment, before Bookmark)

**Step 1: Add Sophos fields to Tenant model**

In `prisma/schema.prisma`, add 3 fields to the Tenant model (after `ninjaOrgName` on line 95) and add the relation:

```prisma
  sophosOrgId   String?  @map("sophos_org_id")
  sophosRegion  String?  @map("sophos_region")
  sophosApiHost String?  @map("sophos_api_host")
```

Add relation to Tenant:
```prisma
  crossLinks         DeviceCrossLink[]
```

**Step 2: Add DeviceCrossLink model**

After the DeviceAssignment model (line 346), add:

```prisma
model DeviceCrossLink {
  id                 Int      @id @default(autoincrement())
  tenantId           Int
  tenant             Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  ninjaDeviceId      Int      @map("ninja_device_id")
  ninjaDeviceName    String   @map("ninja_device_name")
  sophosEndpointId   String   @map("sophos_endpoint_id")
  sophosEndpointName String   @map("sophos_endpoint_name")
  linkedAt           DateTime @default(now()) @map("linked_at")
  linkedBy           String   @map("linked_by")

  @@unique([tenantId, ninjaDeviceId])
  @@unique([tenantId, sophosEndpointId])
  @@map("device_cross_links")
}
```

**Step 3: Run migration**

```bash
cd /home/ardepa/tum2026
npx prisma migrate dev --name add_sophos_and_cross_links
```

Expected: Migration created + Prisma client regenerated.

**Step 4: Verify**

```bash
npx prisma generate
```

**Step 5: Commit**

```bash
git add prisma/
git commit -m "feat: add Sophos fields to Tenant and DeviceCrossLink model"
```

---

## Task 2: Sophos TypeScript Types

**Files:**
- Create: `src/lib/types/sophos.ts`

**Step 1: Create types file**

Follow the pattern from `src/lib/types/ninja.ts`. Create `src/lib/types/sophos.ts`:

```typescript
// ---------------------------------------------------------------------------
// Partner / Tenant discovery
// ---------------------------------------------------------------------------

export interface SophosWhoAmI {
  id: string;
  idType: "partner" | "organization" | "tenant";
  apiHosts: { global: string; dataRegion?: string };
}

export interface SophosManagedTenant {
  id: string;
  name: string;
  dataGeography: string;
  dataRegion: string;
  billingType: string;
  apiHost: string;
  status: string;
}

export interface SophosTenantListResponse {
  items: SophosManagedTenant[];
  pages: { current: number; total: number; size: number; maxSize: number };
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export interface SophosEndpoint {
  id: string;
  type: "computer" | "server";
  hostname: string;
  ipv4Addresses?: string[];
  ipv6Addresses?: string[];
  macAddresses?: string[];
  os?: {
    name: string;
    platform: string;
    majorVersion: number;
    minorVersion: number;
    build: number;
    isServer: boolean;
  };
  health?: {
    overall: "good" | "suspicious" | "bad" | "unknown";
    threats: { status: string };
    services: { status: string; serviceDetails?: { name: string; status: string }[] };
  };
  tamperProtectionEnabled?: boolean;
  isolation?: { status: "isolated" | "notIsolated"; adminIsolated?: boolean };
  associatedPerson?: { viaLogin: string; id?: string; name?: string };
  assignedProducts?: SophosProduct[];
  lastSeenAt?: string;
  group?: { id: string; name: string };
  tenant?: { id: string };
}

export interface SophosProduct {
  code: string;
  version: string;
  status: string;
}

export interface SophosTamperProtection {
  enabled: boolean;
  password?: string;
  previousPasswords?: { password: string; generatedAt: string }[];
}

export interface SophosEndpointListResponse {
  items: SophosEndpoint[];
  pages: { current: number; total: number; size: number; maxSize: number };
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export interface SophosAlert {
  id: string;
  category: string;
  type: string;
  severity: "high" | "medium" | "low";
  description: string;
  product: string;
  managedAgent?: { id: string; type: string };
  person?: { id: string };
  raisedAt: string;
  allowedActions?: string[];
  groupKey?: string;
  // Enriched client-side
  tenantDbId?: number;
  tenantName?: string;
}

export interface SophosAlertListResponse {
  items: SophosAlert[];
  pages: { current: number; total: number; size: number; maxSize: number };
}

// ---------------------------------------------------------------------------
// Account Health Check
// ---------------------------------------------------------------------------

export interface SophosHealthCheck {
  endpoint?: {
    protection?: SophosCheckResult;
    policy?: SophosCheckResult;
    exclusions?: SophosCheckResult;
    tamperProtection?: SophosCheckResult;
  };
}

export interface SophosCheckResult {
  status: "green" | "amber" | "red";
  riskLevel?: string;
  summary?: string;
}

// ---------------------------------------------------------------------------
// Endpoint Groups
// ---------------------------------------------------------------------------

export interface SophosEndpointGroup {
  id: string;
  name: string;
  description?: string;
  type: "computer" | "server";
  endpoints?: { itemsCount: number };
}

export interface SophosEndpointGroupListResponse {
  items: SophosEndpointGroup[];
  pages: { current: number; total: number; size: number; maxSize: number };
}

// ---------------------------------------------------------------------------
// Policies (read-only)
// ---------------------------------------------------------------------------

export interface SophosPolicy {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  priority: number;
  settings?: Record<string, unknown>;
}
```

**Step 2: Commit**

```bash
git add src/lib/types/sophos.ts
git commit -m "feat: add Sophos Central TypeScript type definitions"
```

---

## Task 3: Sophos Client-Safe Utils

**Files:**
- Create: `src/lib/sophos-utils.ts`

**Step 1: Create utils file**

Follow the pattern from `src/lib/ninja-utils.ts` (46 lines, pure functions, no server imports):

```typescript
/**
 * Client-safe utility functions for Sophos data.
 * NO server imports (no prisma, no auth, no sophos.ts).
 */

export function sophosHealthColor(
  health?: string
): string {
  switch (health) {
    case "good":
      return "bg-green-500/10 text-green-400";
    case "suspicious":
      return "bg-yellow-500/10 text-yellow-400";
    case "bad":
      return "bg-red-500/10 text-red-400";
    default:
      return "bg-gray-500/10 text-gray-400";
  }
}

export function sophosHealthLabel(health?: string): string {
  switch (health) {
    case "good":
      return "Healthy";
    case "suspicious":
      return "Suspicious";
    case "bad":
      return "Unhealthy";
    default:
      return "Unknown";
  }
}

export function sophosSeverityColor(severity?: string): string {
  switch (severity) {
    case "high":
      return "bg-red-500/10 text-red-400";
    case "medium":
      return "bg-orange-500/10 text-orange-400";
    case "low":
      return "bg-yellow-500/10 text-yellow-400";
    default:
      return "bg-gray-500/10 text-gray-400";
  }
}

export function sophosSeverityLabel(severity?: string): string {
  switch (severity) {
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
    default:
      return "Unknown";
  }
}

export function sophosCheckColor(status?: string): string {
  switch (status) {
    case "green":
      return "bg-green-500/10 text-green-400";
    case "amber":
      return "bg-yellow-500/10 text-yellow-400";
    case "red":
      return "bg-red-500/10 text-red-400";
    default:
      return "bg-gray-500/10 text-gray-400";
  }
}

export function sophosEndpointTypeLabel(type?: string): string {
  return type === "server" ? "Server" : "Workstation";
}

export function formatSophosTime(iso?: string): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}
```

**Step 2: Commit**

```bash
git add src/lib/sophos-utils.ts
git commit -m "feat: add client-safe Sophos utility functions"
```

---

## Task 4: Sophos API Client

**Files:**
- Create: `src/lib/sophos.ts`

**Step 1: Create the API client**

Follow the pattern from `src/lib/ninja.ts` (lines 1-92 for auth/fetch, then function exports):

```typescript
import { prisma } from "@/lib/prisma";
import type {
  SophosWhoAmI,
  SophosManagedTenant,
  SophosTenantListResponse,
  SophosEndpoint,
  SophosEndpointListResponse,
  SophosTamperProtection,
  SophosAlert,
  SophosAlertListResponse,
  SophosHealthCheck,
  SophosEndpointGroup,
  SophosEndpointGroupListResponse,
} from "@/lib/types/sophos";

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const SOPHOS_CLIENT_ID = process.env.SOPHOS_CLIENT_ID!;
const SOPHOS_CLIENT_SECRET = process.env.SOPHOS_CLIENT_SECRET!;

const SOPHOS_AUTH_URL = "https://id.sophos.com/api/v2/oauth2/token";
const SOPHOS_GLOBAL_URL = "https://api.central.sophos.com";

// ---------------------------------------------------------------------------
// Token cache  (single global — Sophos uses one partner token for everything)
// ---------------------------------------------------------------------------

let tokenCache: {
  token: string;
  partnerId: string;
  expiresAt: number;
} | null = null;

async function getAccessToken(): Promise<{
  token: string;
  partnerId: string;
}> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return { token: tokenCache.token, partnerId: tokenCache.partnerId };
  }

  // Step 1: Get JWT
  const body = new URLSearchParams({
    client_id: SOPHOS_CLIENT_ID,
    client_secret: SOPHOS_CLIENT_SECRET,
    scope: "token",
    grant_type: "client_credentials",
  });

  const tokenRes = await fetch(SOPHOS_AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    const error = await tokenRes.text();
    throw new Error(`Sophos token request failed: ${error}`);
  }

  const tokenData = await tokenRes.json();
  const token = tokenData.access_token as string;

  // Step 2: Get partner ID via whoami
  const whoamiRes = await fetch(`${SOPHOS_GLOBAL_URL}/whoami/v1`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!whoamiRes.ok) {
    throw new Error(`Sophos whoami failed: ${whoamiRes.status}`);
  }

  const whoami: SophosWhoAmI = await whoamiRes.json();

  tokenCache = {
    token,
    partnerId: whoami.id,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
  };

  return { token, partnerId: whoami.id };
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

/**
 * Fetch from the global Sophos API (partner-level calls).
 * Uses X-Partner-ID header.
 */
async function sophosGlobalFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const { token, partnerId } = await getAccessToken();

  const res = await fetch(`${SOPHOS_GLOBAL_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Partner-ID": partnerId,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`Sophos API error: ${path} returned ${res.status}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Fetch from a tenant-specific Sophos API.
 * Looks up sophosTenantId + sophosApiHost from the TUM Tenant DB record.
 * Uses X-Tenant-ID header + regional apiHost.
 */
async function sophosTenantFetch<T>(
  tenantDbId: number,
  path: string,
  init?: RequestInit
): Promise<T> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantDbId },
    select: { sophosOrgId: true, sophosApiHost: true },
  });

  if (!tenant?.sophosOrgId || !tenant?.sophosApiHost) {
    throw new Error(`Tenant ${tenantDbId} is not linked to Sophos.`);
  }

  const { token } = await getAccessToken();

  const res = await fetch(`${tenant.sophosApiHost}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Tenant-ID": tenant.sophosOrgId,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    throw new Error(
      `Sophos tenant API error: ${path} returned ${res.status}`
    );
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Partner-level functions
// ---------------------------------------------------------------------------

export async function getSophosPartnerTenants(): Promise<
  SophosManagedTenant[]
> {
  const data = await sophosGlobalFetch<SophosTenantListResponse>(
    "/partner/v1/tenants?pageTotal=true"
  );
  return data.items;
}

// ---------------------------------------------------------------------------
// Endpoint functions
// ---------------------------------------------------------------------------

export async function getSophosEndpoints(
  tenantDbId: number,
  params?: {
    pageSize?: number;
    page?: number;
    healthStatus?: string;
    type?: string;
    search?: string;
    groupId?: string;
    isolationStatus?: string;
    tamperProtectionEnabled?: boolean;
  }
): Promise<SophosEndpointListResponse> {
  const qs = new URLSearchParams();
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params?.page) qs.set("page", String(params.page));
  if (params?.healthStatus) qs.set("healthStatus", params.healthStatus);
  if (params?.type) qs.set("type", params.type);
  if (params?.search) qs.set("search", params.search);
  if (params?.groupId)
    qs.set("groupNameContains", params.groupId);
  if (params?.isolationStatus)
    qs.set("isolationStatus", params.isolationStatus);
  if (params?.tamperProtectionEnabled !== undefined)
    qs.set(
      "tamperProtectionEnabled",
      String(params.tamperProtectionEnabled)
    );

  const query = qs.toString();
  return sophosTenantFetch<SophosEndpointListResponse>(
    tenantDbId,
    `/endpoint/v1/endpoints${query ? `?${query}` : ""}`
  );
}

export async function getSophosEndpoint(
  tenantDbId: number,
  endpointId: string
): Promise<SophosEndpoint> {
  return sophosTenantFetch<SophosEndpoint>(
    tenantDbId,
    `/endpoint/v1/endpoints/${endpointId}`
  );
}

export async function getSophosEndpointTamper(
  tenantDbId: number,
  endpointId: string
): Promise<SophosTamperProtection> {
  return sophosTenantFetch<SophosTamperProtection>(
    tenantDbId,
    `/endpoint/v1/endpoints/${endpointId}/tamper-protection`
  );
}

// ---------------------------------------------------------------------------
// Endpoint actions
// ---------------------------------------------------------------------------

export async function setSophosEndpointTamper(
  tenantDbId: number,
  endpointId: string,
  enabled: boolean
): Promise<SophosTamperProtection> {
  return sophosTenantFetch<SophosTamperProtection>(
    tenantDbId,
    `/endpoint/v1/endpoints/${endpointId}/tamper-protection`,
    {
      method: "POST",
      body: JSON.stringify({ enabled }),
    }
  );
}

export async function startSophosScan(
  tenantDbId: number,
  endpointId: string
): Promise<{ id: string; status: string }> {
  return sophosTenantFetch(
    tenantDbId,
    `/endpoint/v1/endpoints/${endpointId}/scans`,
    {
      method: "POST",
      body: JSON.stringify({}),
    }
  );
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export async function getSophosAlerts(
  tenantDbId: number,
  params?: { pageSize?: number; page?: number; severity?: string }
): Promise<SophosAlertListResponse> {
  const qs = new URLSearchParams();
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params?.page) qs.set("page", String(params.page));
  if (params?.severity) qs.set("severity", params.severity);

  const query = qs.toString();
  return sophosTenantFetch<SophosAlertListResponse>(
    tenantDbId,
    `/common/v1/alerts${query ? `?${query}` : ""}`
  );
}

// ---------------------------------------------------------------------------
// Account Health Check
// ---------------------------------------------------------------------------

export async function getSophosHealthCheck(
  tenantDbId: number
): Promise<SophosHealthCheck> {
  return sophosTenantFetch<SophosHealthCheck>(
    tenantDbId,
    "/account-health-check/v1/health-check?checks=protection,policy,exclusions,tamperProtection"
  );
}

// ---------------------------------------------------------------------------
// Endpoint Groups
// ---------------------------------------------------------------------------

export async function getSophosEndpointGroups(
  tenantDbId: number
): Promise<SophosEndpointGroupListResponse> {
  return sophosTenantFetch<SophosEndpointGroupListResponse>(
    tenantDbId,
    "/endpoint/v1/endpoint-groups"
  );
}

export async function getSophosGroupDetail(
  tenantDbId: number,
  groupId: string
): Promise<SophosEndpointGroup> {
  return sophosTenantFetch<SophosEndpointGroup>(
    tenantDbId,
    `/endpoint/v1/endpoint-groups/${groupId}`
  );
}

export async function getSophosGroupEndpoints(
  tenantDbId: number,
  groupId: string,
  params?: { pageSize?: number; page?: number }
): Promise<SophosEndpointListResponse> {
  const qs = new URLSearchParams();
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params?.page) qs.set("page", String(params.page));

  const query = qs.toString();
  return sophosTenantFetch<SophosEndpointListResponse>(
    tenantDbId,
    `/endpoint/v1/endpoint-groups/${groupId}/endpoints${query ? `?${query}` : ""}`
  );
}
```

**Step 2: Commit**

```bash
git add src/lib/sophos.ts
git commit -m "feat: add Sophos Central API client with auth and 13 functions"
```

---

## Task 5: Sidebar — Add Security Group

**Files:**
- Modify: `src/components/layout/sidebar.tsx:95-105` (add securityItems array + GroupState)

**Step 1: Add securityItems array**

After `rmmItems` (line 99), add:

```typescript
const securityItems: NavItem[] = [
  { href: "/dashboard/sophos/endpoints", label: "Endpoints", icon: Shield },
  { href: "/dashboard/sophos/groups", label: "Groups", icon: FolderTree },
  { href: "/dashboard/sophos/settings", label: "Settings", icon: Settings },
];
```

Import `Shield` and `FolderTree` from lucide-react (Shield already imported, add FolderTree).

**Step 2: Update GroupState type**

Change line 105 from:
```typescript
type GroupState = { msp: boolean; rmm: boolean };
```
to:
```typescript
type GroupState = { msp: boolean; rmm: boolean; security: boolean };
```

**Step 3: Update default state**

Find where `loadGroupState` is called with defaults and add `security: true`.

**Step 4: Add filter for security items**

Find where `visibleRmm` is defined (pattern: `const visibleRmm = rmmItems.filter(...)`) and add:

```typescript
const visibleSecurity = securityItems.filter((item) =>
  canAccessPage(role, item.href)
);
```

**Step 5: Add NavGroup render for Security**

After the RMM NavGroup block (lines 310-315), add:

```typescript
{/* Security group */}
<NavGroup
  label="Security"
  items={visibleSecurity}
  isOpen={groups.security}
  onToggle={() => toggleGroup("security")}
/>
```

**Step 6: Repeat in mobile sidebar section**

Find the mobile sidebar rendering and add the same Security NavGroup there too.

**Step 7: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: add Security collapsible group to sidebar"
```

---

## Task 6: Sophos Settings Page + Actions

**Files:**
- Create: `src/app/dashboard/sophos/settings/page.tsx`
- Create: `src/app/dashboard/sophos/settings/actions.ts`
- Create: `src/components/sophos-link-table.tsx`

**Step 1: Create server actions**

Follow the exact pattern from `src/app/dashboard/rmm/settings/actions.ts`:

`src/app/dashboard/sophos/settings/actions.ts`:
```typescript
"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit, getActor } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function linkTenantToSophos(
  _prevState: { error: string },
  formData: FormData
) {
  await requireRole("ADMIN");
  const actor = await getActor();

  const tenantIdRaw = formData.get("tenantId") as string;
  const sophosOrgId = (formData.get("sophosOrgId") as string)?.trim();
  const sophosRegion = (formData.get("sophosRegion") as string)?.trim();
  const sophosApiHost = (formData.get("sophosApiHost") as string)?.trim();

  const tenantId = Number(tenantIdRaw);

  if (!tenantIdRaw || isNaN(tenantId)) {
    return { error: "Invalid tenant ID." };
  }
  if (!sophosOrgId) {
    return { error: "Please select a Sophos tenant." };
  }

  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { sophosOrgId, sophosRegion, sophosApiHost },
    });
  } catch {
    return { error: "Failed to link tenant. Please try again." };
  }

  logAudit({
    actor,
    action: "LINK",
    entity: "TENANT_SOPHOS",
    entityId: tenantId,
    details: { tenantId, sophosOrgId, sophosRegion },
  });

  revalidatePath("/dashboard/sophos/settings");
  return { error: "" };
}

export async function unlinkTenantFromSophos(
  _prevState: { error: string },
  formData: FormData
) {
  await requireRole("ADMIN");
  const actor = await getActor();

  const tenantIdRaw = formData.get("tenantId") as string;
  const tenantId = Number(tenantIdRaw);

  if (!tenantIdRaw || isNaN(tenantId)) {
    return { error: "Invalid tenant ID." };
  }

  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { sophosOrgId: null, sophosRegion: null, sophosApiHost: null },
    });
  } catch {
    return { error: "Failed to unlink tenant. Please try again." };
  }

  logAudit({
    actor,
    action: "UNLINK",
    entity: "TENANT_SOPHOS",
    entityId: tenantId,
    details: { tenantId },
  });

  revalidatePath("/dashboard/sophos/settings");
  return { error: "" };
}
```

**Step 2: Create link table component**

Follow the exact pattern from `src/components/ninja-link-table.tsx`. Create `src/components/sophos-link-table.tsx`:

- Props: `tenants` (array with id, tenantName, tenantAbbrv, sophosOrgId), `sophosOrgs` (array with id, name, dataRegion, apiHost)
- Each row: if linked → show linked org name + unlink button; if not → dropdown of available Sophos tenants + link button
- Uses `useActionState` for `linkTenantToSophos` / `unlinkTenantFromSophos`
- Hidden form fields pass `sophosOrgId`, `sophosRegion`, `sophosApiHost` along with `tenantId`

**Step 3: Create settings page**

Follow `src/app/dashboard/rmm/settings/page.tsx` pattern exactly:

`src/app/dashboard/sophos/settings/page.tsx`:
```typescript
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getSophosPartnerTenants } from "@/lib/sophos";
import { SophosLinkTable } from "@/components/sophos-link-table";
import { Settings, AlertTriangle } from "lucide-react";

export default async function SophosSettingsPage() {
  await requireRole("ADMIN");

  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      tenantName: true,
      tenantAbbrv: true,
      sophosOrgId: true,
      sophosRegion: true,
      sophosApiHost: true,
    },
    orderBy: { tenantName: "asc" },
  });

  let sophosOrgs: Array<{ id: string; name: string; dataRegion: string; apiHost: string }> = [];
  let sophosError: string | null = null;

  try {
    const orgs = await getSophosPartnerTenants();
    sophosOrgs = orgs.map((o) => ({
      id: o.id,
      name: o.name,
      dataRegion: o.dataRegion,
      apiHost: o.apiHost,
    }));
  } catch (err) {
    sophosError =
      err instanceof Error
        ? err.message
        : "Failed to connect to Sophos Central API.";
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Sophos Settings
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Link Microsoft Tenants to Sophos Central Tenants
          </p>
        </div>
        <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
          <Settings className="w-5 h-5" style={{ color: "var(--accent)" }} />
        </div>
      </div>

      {sophosError && (
        <div className="mb-6 flex items-start gap-3 p-4 bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-xl">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "var(--error)" }} />
          <div>
            <p className="text-sm font-medium text-[var(--error)]">
              Sophos Central Connection Failed
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {sophosError}. You can still see current links below, but cannot
              create new ones until the connection is restored.
            </p>
          </div>
        </div>
      )}

      <SophosLinkTable tenants={tenants} sophosOrgs={sophosOrgs} />
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/app/dashboard/sophos/settings/ src/components/sophos-link-table.tsx
git commit -m "feat: add Sophos settings page with tenant linking"
```

---

## Task 7: Sophos API Routes — Endpoints

**Files:**
- Create: `src/app/api/sophos/tenants/route.ts`
- Create: `src/app/api/sophos/endpoints/route.ts`
- Create: `src/app/api/sophos/endpoints/[endpointId]/route.ts`
- Create: `src/app/api/sophos/endpoints/[endpointId]/tamper/route.ts`
- Create: `src/app/api/sophos/endpoints/[endpointId]/scan/route.ts`

**Step 1: Create routes**

Follow the pattern from `src/app/api/ninja/devices/[deviceId]/route.ts`:

Each route:
1. Check auth session
2. Validate params (tenantId as query param, endpointId from path)
3. Call sophos.ts function
4. Return JSON
5. Action routes (scan, tamper): check EDITOR+ role, audit log

See `src/app/api/ninja/devices/[deviceId]/route.ts` for exact pattern.

Key differences from NinjaOne routes:
- `tenantId` comes as query param `?tenantId=X` (integer, parsed to number)
- `endpointId` is a UUID string (no number parsing needed)
- Action routes (POST) check `hasMinRole(role, "EDITOR")`

**Step 2: Commit**

```bash
git add src/app/api/sophos/
git commit -m "feat: add Sophos API routes for endpoints, tamper, and scan"
```

---

## Task 8: Sophos API Routes — Alerts, Health, Groups, Policies

**Files:**
- Create: `src/app/api/sophos/alerts/route.ts`
- Create: `src/app/api/sophos/health/route.ts`
- Create: `src/app/api/sophos/groups/route.ts`
- Create: `src/app/api/sophos/groups/[groupId]/route.ts`
- Create: `src/app/api/sophos/groups/[groupId]/endpoints/route.ts`
- Create: `src/app/api/sophos/policies/route.ts`

**Step 1: Create all read-only routes**

All follow the same pattern:
1. Check auth session
2. Get `tenantId` from query params → parse to number
3. Call corresponding sophos.ts function
4. Return JSON

No RBAC check needed for GET routes (all authenticated users can read).

**Step 2: Commit**

```bash
git add src/app/api/sophos/
git commit -m "feat: add Sophos API routes for alerts, health, groups, and policies"
```

---

## Task 9: Sophos Endpoints Page + Components

**Files:**
- Create: `src/app/dashboard/sophos/endpoints/page.tsx`
- Create: `src/components/sophos-endpoint-table.tsx`
- Create: `src/components/sophos-health-badge.tsx`

**Step 1: Create health badge component**

Small client component — color-coded badge using `sophosHealthColor` and `sophosHealthLabel` from `sophos-utils.ts`.

**Step 2: Create endpoint table component**

Follow `src/components/ninja-device-table.tsx` pattern:
- Client component with state for filters (tenant dropdown, health status, type, tamper, search)
- Fetch from `/api/sophos/endpoints?tenantId=X` on filter change
- Render table with columns: Hostname, Type, OS, Health, Tamper, Last Seen, Tenant
- Health column uses `SophosHealthBadge`
- Click row → navigate to `/dashboard/sophos/endpoints/[id]?tenantId=X`

Props from server: `tenants` array (id, tenantAbbrv, sophosOrgId — only Sophos-linked tenants).

**Step 3: Create endpoints page**

Server component:
```typescript
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
// ...

export default async function SophosEndpointsPage() {
  const role = await requireRole("VIEWER");

  const tenants = await prisma.tenant.findMany({
    where: { sophosOrgId: { not: null } },
    select: { id: true, tenantAbbrv: true, sophosOrgId: true },
    orderBy: { tenantName: "asc" },
  });

  return (
    <div>
      {/* Header */}
      {/* SophosEndpointTable component */}
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/app/dashboard/sophos/endpoints/page.tsx src/components/sophos-endpoint-table.tsx src/components/sophos-health-badge.tsx
git commit -m "feat: add Sophos endpoints page with filterable table"
```

---

## Task 10: Sophos Endpoint Detail Page + Component

**Files:**
- Create: `src/app/dashboard/sophos/endpoints/[endpointId]/page.tsx`
- Create: `src/components/sophos-endpoint-detail.tsx`
- Create: `src/components/sophos-endpoint-actions.tsx`
- Create: `src/components/sophos-severity-badge.tsx`
- Create: `src/app/dashboard/sophos/endpoints/actions.ts`

**Step 1: Create severity badge**

Small component using `sophosSeverityColor` from utils.

**Step 2: Create endpoint actions component**

Client component with two actions (EDITOR+ only):
- **Start Scan:** POST to `/api/sophos/endpoints/[id]/scan` with confirm dialog
- **Toggle Tamper:** POST to `/api/sophos/endpoints/[id]/tamper` with toggle switch

Follow `src/components/ninja-device-actions.tsx` pattern but much simpler (only 2 actions).

**Step 3: Create server actions**

`src/app/dashboard/sophos/endpoints/actions.ts`:
```typescript
"use server";
// startScan(tenantId, endpointId) — EDITOR+
// toggleTamper(tenantId, endpointId, enabled) — EDITOR+
// Follow pattern from src/app/dashboard/rmm/devices/actions.ts
```

**Step 4: Create endpoint detail component**

Follow `src/components/ninja-device-detail.tsx` pattern with 6 collapsible sections:

1. **Overview** — hostname, type, OS, IPs, MACs, last seen, associated person
2. **Protection** — tamper status, installed products with versions, health threats/services
3. **Health Check** — Account health results (protection, policy, exclusions, tamper) with colored badges
4. **Isolation** — Status display (read-only for now)
5. **Alerts** — Alerts for this endpoint (lazy-loaded on expand)
6. **Groups** — Groups this endpoint belongs to (clickable → `/dashboard/sophos/groups/[id]`)

Each section lazy-loads data on expand (same pattern as ninja-device-detail.tsx useEffects on lines 306-388).

**Step 5: Create detail page**

Server component:
- Parse `endpointId` from params, `tenantId` from searchParams
- Fetch endpoint detail server-side
- Pass to `SophosEndpointDetail` client component

**Step 6: Commit**

```bash
git add src/app/dashboard/sophos/endpoints/ src/components/sophos-endpoint-detail.tsx src/components/sophos-endpoint-actions.tsx src/components/sophos-severity-badge.tsx
git commit -m "feat: add Sophos endpoint detail page with 6 sections and actions"
```

---

## Task 11: Sophos Tenant Detail Page

**Files:**
- Create: `src/app/dashboard/sophos/tenants/[tenantId]/page.tsx`
- Create: `src/components/sophos-tenant-card.tsx`

**Step 1: Create tenant card component**

Card showing: tenant name, abbreviation, Sophos org name, region, health check summary (4 colored dots for protection/policy/exclusions/tamper).

**Step 2: Create tenant detail page**

Server component:
- Fetch tenant from DB
- Fetch health check from Sophos API (try-catch)
- Render: header with tenant info, health check breakdown, endpoints table (reuse `SophosEndpointTable` with tenantId pre-selected)

**Step 3: Commit**

```bash
git add src/app/dashboard/sophos/tenants/ src/components/sophos-tenant-card.tsx
git commit -m "feat: add Sophos tenant detail page with health check"
```

---

## Task 12: Sophos Groups Pages + Components

**Files:**
- Create: `src/app/dashboard/sophos/groups/page.tsx`
- Create: `src/app/dashboard/sophos/groups/[groupId]/page.tsx`
- Create: `src/components/sophos-group-card.tsx`
- Create: `src/components/sophos-group-detail.tsx`

**Step 1: Create group card component**

Card showing: group name, description, type badge (default/custom), endpoint count, tenant badge.

**Step 2: Create groups list page**

Server component:
- Fetch Sophos-linked tenants from DB
- Client component fetches groups per tenant on dropdown change
- Card grid layout

**Step 3: Create group detail component**

Client component with:
- Group info header (name, description, type)
- Endpoints table (fetch from `/api/sophos/groups/[groupId]/endpoints?tenantId=X`)
- Each endpoint row clickable → navigates to endpoint detail

**Step 4: Create group detail page**

Server component — parse groupId and tenantId, render `SophosGroupDetail`.

**Step 5: Commit**

```bash
git add src/app/dashboard/sophos/groups/ src/components/sophos-group-card.tsx src/components/sophos-group-detail.tsx
git commit -m "feat: add Sophos endpoint groups pages with card grid and detail view"
```

---

## Task 13: Alert Integration

**Files:**
- Modify: `src/lib/alerts.ts:5-18` (Alert type union)
- Modify: `src/lib/alerts.ts:76-123` (per-tenant loop)

**Step 1: Extend Alert type**

Add `"sophos_alert"` to the type union on line 7-11:

```typescript
type:
  | "failed_runs"
  | "low_health"
  | "service_degraded"
  | "stale_sync"
  | "sophos_alert";
```

**Step 2: Add Sophos alerts in the per-tenant loop**

Inside the `for (const tenant of tenants)` loop (after the service degradation block around line 122), add:

```typescript
    // Sophos high-severity alerts
    if (tenant.sophosOrgId) {
      try {
        const { getSophosAlerts } = await import("@/lib/sophos");
        const alertData = await getSophosAlerts(tenant.id, {
          pageSize: 10,
          severity: "high",
        });
        for (const sa of alertData.items) {
          alerts.push({
            id: `sophos-alert-${sa.id}`,
            type: "sophos_alert",
            severity: "error",
            title: `Sophos: ${sa.description}`,
            description: `${sa.category} — ${sa.product} (${tenant.tenantAbbrv})`,
            tenantId: tenant.id,
            tenantName: tenant.tenantName,
            link: `/dashboard/sophos/endpoints`,
          });
        }
      } catch {
        /* skip tenant on Sophos error */
      }
    }
```

Note: Uses dynamic `import()` to avoid importing Sophos everywhere alerts.ts is used.

**Step 3: Update tenant query**

Add `sophosOrgId: true` to the select clause in the tenant query (around line 78):

```typescript
const tenants = await prisma.tenant.findMany({
  select: {
    id: true,
    tenantName: true,
    tenantAbbrv: true,
    sophosOrgId: true,  // ← add this
  },
});
```

**Step 4: Commit**

```bash
git add src/lib/alerts.ts
git commit -m "feat: integrate Sophos high-severity alerts into alert engine"
```

---

## Task 14: Cross-Link API Routes + Server Actions

**Files:**
- Create: `src/app/api/cross-links/route.ts` (GET, POST)
- Create: `src/app/api/cross-links/[id]/route.ts` (DELETE)
- Create: `src/app/api/cross-links/auto-match/route.ts` (POST)
- Create: `src/app/dashboard/sophos/cross-links/actions.ts`

**Step 1: Create cross-links CRUD API routes**

`GET /api/cross-links?tenantId=X` — List cross-links for a tenant
`POST /api/cross-links` — Create a cross-link (body: tenantId, ninjaDeviceId, ninjaDeviceName, sophosEndpointId, sophosEndpointName). EDITOR+ role.
`DELETE /api/cross-links/[id]` — Delete a cross-link. EDITOR+ role.

Follow pattern from existing API routes.

**Step 2: Create auto-match route**

`POST /api/cross-links/auto-match?tenantId=X` — ADMIN only.

Logic:
1. Fetch tenant from DB — get both `ninjaOrgId` and `sophosOrgId`
2. If either is not linked, return error
3. Fetch NinjaOne devices for the org: `getNinjaOrgDevices(ninjaOrgId)`
4. Fetch Sophos endpoints for the tenant: `getSophosEndpoints(tenantDbId)`
5. Match by hostname: `device.systemName.toLowerCase() === endpoint.hostname.toLowerCase()`
6. Fetch existing cross-links to exclude already-linked devices/endpoints
7. Return `{ suggestions: [{ ninjaDeviceId, ninjaDeviceName, sophosEndpointId, sophosEndpointName }] }`

**Step 3: Create server actions**

`src/app/dashboard/sophos/cross-links/actions.ts`:
```typescript
"use server";
// createCrossLink(tenantId, ninjaDeviceId, ninjaDeviceName, sophosEndpointId, sophosEndpointName) — EDITOR+
// deleteCrossLink(crossLinkId) — EDITOR+
// bulkCreateCrossLinks(tenantId, matches[]) — ADMIN
// All use prisma.deviceCrossLink.create/delete, audit log, revalidate
```

Follow `src/app/dashboard/rmm/devices/actions.ts` pattern for return types.

**Step 4: Commit**

```bash
git add src/app/api/cross-links/ src/app/dashboard/sophos/cross-links/
git commit -m "feat: add cross-link API routes and server actions with auto-match"
```

---

## Task 15: Cross-Link UI Components

**Files:**
- Create: `src/components/sophos-cross-link-section.tsx`
- Create: `src/components/ninja-cross-link-section.tsx`
- Create: `src/components/cross-link-manager.tsx`

**Step 1: Create sophos-cross-link-section.tsx**

Client component for the Sophos Endpoint Detail page (section #7 — "Linked RMM Device"):
- Props: `tenantId`, `sophosEndpointId`, `sophosEndpointName`, `role`
- On mount: fetch `GET /api/cross-links?tenantId=X` and find match by `sophosEndpointId`
- If linked: Show NinjaOne device card (name, link to `/dashboard/rmm/devices/[id]`) + unlink button (EDITOR+)
- If not linked: Dropdown of NinjaOne devices (fetch from `/api/ninja/organizations/[orgId]/devices`) + link button (EDITOR+)
- Uses three-value state pattern: `undefined` = loading, `null` = no link, `object` = linked

**Step 2: Create ninja-cross-link-section.tsx**

Same but reverse direction — for the NinjaOne Device Detail page:
- Props: `tenantId`, `ninjaDeviceId`, `ninjaDeviceName`, `role`
- Shows linked Sophos endpoint or dropdown to link one
- Link navigates to `/dashboard/sophos/endpoints/[id]?tenantId=X`

**Step 3: Create cross-link-manager.tsx**

Client component for the Sophos Settings page (tab or section below the link table):
- Props: `tenants` (only tenants with BOTH ninjaOrgId and sophosOrgId linked)
- Tenant dropdown → on select, fetch existing cross-links
- Display table: NinjaOne Device ↔ Sophos Endpoint, with unlink buttons
- "Auto-match by hostname" button (ADMIN) → POST to `/api/cross-links/auto-match` → preview modal with checkboxes → confirm creates bulk links
- Summary bar: "X linked, Y unlinked"

**Step 4: Commit**

```bash
git add src/components/sophos-cross-link-section.tsx src/components/ninja-cross-link-section.tsx src/components/cross-link-manager.tsx
git commit -m "feat: add cross-link UI components for bidirectional device linking"
```

---

## Task 16: Integrate Cross-Link Sections into Detail Pages

**Files:**
- Modify: `src/components/sophos-endpoint-detail.tsx` (add cross-link section)
- Modify: `src/components/ninja-device-detail.tsx` (add cross-link section)

**Step 1: Add cross-link section to Sophos Endpoint Detail**

In `sophos-endpoint-detail.tsx`, add a 7th collapsible section "Linked RMM Device" that renders `<SophosCrossLinkSection>`.

**Step 2: Add cross-link section to NinjaOne Device Detail**

In `src/components/ninja-device-detail.tsx`, add a 9th collapsible section "Linked Security Endpoint" (after Assignment at line 1258):

- Add `"crossLink"` to the SectionKey type union (line 96-104)
- Add a new `<Section>` block rendering `<NinjaCrossLinkSection>`
- Need to pass `tenantId` — derive from the device's organization linked tenant (fetch from DB or pass as prop)

**Step 3: Add cross-link manager to Sophos Settings**

In `src/app/dashboard/sophos/settings/page.tsx`, add `<CrossLinkManager>` component below the `<SophosLinkTable>`.

Query tenants that have BOTH integrations linked:
```typescript
const crossLinkTenants = tenants.filter(
  (t) => t.ninjaOrgId && t.sophosOrgId
);
```

**Step 4: Commit**

```bash
git add src/components/sophos-endpoint-detail.tsx src/components/ninja-device-detail.tsx src/app/dashboard/sophos/settings/page.tsx
git commit -m "feat: integrate cross-link sections into device and endpoint detail pages"
```

---

## Task 17: Final Integration + Bottom Nav

**Files:**
- Modify: `src/components/bottom-nav.tsx` (optional: add Security item)
- Modify: `src/middleware.ts` (ensure /dashboard/sophos/* routes are protected)

**Step 1: Verify middleware**

Check that `src/middleware.ts` protects all `/dashboard/*` routes (it should, since it's a wildcard). No change needed if pattern is `/dashboard/:path*`.

**Step 2: Update bottom nav (optional)**

If desired, add a Security item to the mobile bottom nav. The current nav has 5 items (Home, Tenants, Users, Tasks, Settings). Could replace one or add conditionally.

**Step 3: Add environment variables**

Add to `.env.local`:
```
SOPHOS_CLIENT_ID=<your-partner-client-id>
SOPHOS_CLIENT_SECRET=<your-partner-client-secret>
```

Add to `~/.claude/.secrets.env`:
```
TUM2026_SOPHOS_CLIENT_ID=<value>
TUM2026_SOPHOS_CLIENT_SECRET=<value>
```

**Step 4: Build verification**

```bash
cd /home/ardepa/tum2026
npm run build
```

Expected: Build succeeds with no TypeScript errors.

**Step 5: Manual testing checklist**

1. ✅ Settings page loads, shows tenant list + Sophos org dropdown
2. ✅ Link a tenant to Sophos → sophosOrgId saved in DB
3. ✅ Endpoints page loads, shows endpoints from linked tenant
4. ✅ Click endpoint → detail page with 6+ sections
5. ✅ Scan action works (EDITOR+)
6. ✅ Tamper toggle works (EDITOR+)
7. ✅ Groups page loads, shows groups
8. ✅ Group detail shows member endpoints
9. ✅ Alerts page shows Sophos alerts
10. ✅ Cross-link: manual link from Sophos endpoint detail
11. ✅ Cross-link: manual link from NinjaOne device detail
12. ✅ Cross-link: auto-match by hostname
13. ✅ Sidebar: Security group collapses/expands
14. ✅ RBAC: VIEWER cannot see action buttons
15. ✅ Audit logs show Sophos actions

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete Sophos Central integration with cross-links"
```

---

## Summary

| Task | Description | Est. Files |
|------|-------------|------------|
| 1 | Database migration (Tenant + DeviceCrossLink) | 1 |
| 2 | Sophos TypeScript types | 1 |
| 3 | Sophos client-safe utils | 1 |
| 4 | Sophos API client (auth + 13 functions) | 1 |
| 5 | Sidebar Security group | 1 (modify) |
| 6 | Settings page + actions + link table | 3 |
| 7 | API routes — endpoints (5 routes) | 5 |
| 8 | API routes — alerts, health, groups, policies (6 routes) | 6 |
| 9 | Endpoints page + table + health badge | 3 |
| 10 | Endpoint detail + actions + severity badge | 5 |
| 11 | Tenant detail page + card | 2 |
| 12 | Groups pages + components | 4 |
| 13 | Alert integration | 1 (modify) |
| 14 | Cross-link API routes + actions | 4 |
| 15 | Cross-link UI components | 3 |
| 16 | Integrate cross-links into detail pages | 3 (modify) |
| 17 | Final integration + verification | 2 (modify) |
| **Total** | | **~46 files** |
