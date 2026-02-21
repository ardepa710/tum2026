# NinjaOne RMM Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate NinjaOne RMM into TUM2026 with organization management, device monitoring/actions, and Microsoft Tenant ↔ NinjaOne Org linking.

**Architecture:** Single API layer file (`ninja.ts`) with Client Credentials OAuth2 and global token cache. New DB model `DeviceAssignment` for AD User → Device mapping. Sidebar restructured into collapsible MSP/RMM groups. 5 new pages under `/dashboard/rmm/`.

**Tech Stack:** Next.js 16 (App Router), Prisma 7 + PostgreSQL, NinjaOne API v2, TypeScript, Tailwind CSS v4, Lucide React, Recharts

---

## Task 0: Create Feature Branch

**Files:** None

**Step 1:** Create and switch to feature branch

```bash
git checkout main
git pull origin main
git checkout -b feat/ninjaone-rmm-integration
```

**Step 2:** Verify clean state

```bash
git status
```

---

## Task 1: Prisma Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Run: migration command

**Step 1:** Add `ninjaOrgId` and `ninjaOrgName` to the Tenant model, and create the DeviceAssignment model.

In `prisma/schema.prisma`, add to the `Tenant` model (after `domainUrl`):

```prisma
  ninjaOrgId    Int?    @map("ninja_org_id")
  ninjaOrgName  String? @map("ninja_org_name")
```

And add `deviceAssignments DeviceAssignment[]` to the Tenant relations list.

Then add the new model at the end of the file:

```prisma
model DeviceAssignment {
  id              Int      @id @default(autoincrement())
  tenantId        Int
  tenant          Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  ninjaDeviceId   Int      @map("ninja_device_id")
  ninjaDeviceName String   @map("ninja_device_name")
  adUserUpn       String   @map("ad_user_upn")
  adUserName      String   @map("ad_user_name")
  assignedAt      DateTime @default(now()) @map("assigned_at")
  assignedBy      String   @map("assigned_by")

  @@unique([tenantId, ninjaDeviceId])
  @@map("device_assignments")
}
```

**Step 2:** Run migration

```bash
npx prisma migrate dev --name add_ninja_org_and_device_assignments
```

**Step 3:** Verify generation

```bash
npx prisma generate
npx tsc --noEmit
```

**Step 4:** Commit

```bash
git add prisma/
git commit -m "feat: add NinjaOne org fields to Tenant and DeviceAssignment model"
```

---

## Task 2: NinjaOne API Layer

**Files:**
- Create: `src/lib/ninja.ts`
- Create: `src/lib/types/ninja.ts`

### Step 1: Create TypeScript types

Create `src/lib/types/ninja.ts`:

```typescript
export interface NinjaOrganization {
  id: number;
  name: string;
  description?: string;
  nodeApprovalMode?: "AUTOMATIC" | "MANUAL" | "REJECT";
  tags?: string[];
  fields?: Record<string, unknown>;
  userData?: Record<string, unknown>;
}

export interface NinjaOrganizationDetailed extends NinjaOrganization {
  locations?: NinjaLocation[];
  policies?: NinjaPolicy[];
}

export interface NinjaLocation {
  id: number;
  name: string;
  address?: string;
  description?: string;
  userData?: Record<string, unknown>;
  tags?: string[];
  fields?: Record<string, unknown>;
}

export interface NinjaPolicy {
  id: number;
  name: string;
  description?: string;
}

export type NinjaNodeClass =
  | "WINDOWS_SERVER" | "WINDOWS_WORKSTATION" | "LINUX_WORKSTATION"
  | "MAC" | "ANDROID" | "APPLE_IOS" | "APPLE_IPADOS"
  | "VMWARE_VM_HOST" | "VMWARE_VM_GUEST"
  | "HYPERV_VMM_HOST" | "HYPERV_VMM_GUEST"
  | "LINUX_SERVER" | "MAC_SERVER" | "CLOUD_MONITOR_TARGET"
  | "NMS_SWITCH" | "NMS_ROUTER" | "NMS_FIREWALL"
  | "NMS_PRINTER" | "NMS_OTHER" | "NMS_SERVER"
  | "UNMANAGED_DEVICE" | "MANAGED_DEVICE";

export interface NinjaDevice {
  id: number;
  uid?: string;
  organizationId: number;
  locationId?: number;
  nodeClass?: NinjaNodeClass;
  nodeRoleId?: number;
  approvalStatus?: "PENDING" | "APPROVED";
  offline?: boolean;
  displayName?: string;
  systemName?: string;
  dnsName?: string;
  netbiosName?: string;
  created?: number;
  lastContact?: number;
  lastUpdate?: number;
  userData?: Record<string, unknown>;
  tags?: string[];
  fields?: Record<string, unknown>;
  maintenance?: NinjaMaintenanceStatus;
  ipAddresses?: string[];
  macAddresses?: string[];
  publicIP?: string;
  deviceType?: string;
  references?: {
    organization?: NinjaOrganization;
    location?: NinjaLocation;
    rolePolicy?: NinjaPolicy;
    policy?: NinjaPolicy;
  };
}

export interface NinjaMaintenanceStatus {
  status?: string;
  start?: number;
  end?: number;
  reasonMessage?: string;
}

export interface NinjaAlert {
  uid: string;
  deviceId?: number;
  message?: string;
  createTime?: number;
  updateTime?: number;
  sourceType?: string;
  sourceName?: string;
  subject?: string;
  severity?: string;
  priority?: string;
  device?: NinjaDevice;
}

export interface NinjaDisk {
  deviceId: number;
  model?: string;
  interfaceType?: string;
  size?: number;
  partitions?: Array<{
    name?: string;
    fileSystem?: string;
    capacity?: number;
    freeSpace?: number;
  }>;
}

export interface NinjaVolume {
  deviceId: number;
  name?: string;
  label?: string;
  fileSystem?: string;
  capacity?: number;
  freeSpace?: number;
}

export interface NinjaProcessor {
  deviceId: number;
  name?: string;
  architecture?: string;
  maxClockSpeed?: number;
  currentClockSpeed?: number;
  numberOfCores?: number;
  numberOfLogicalProcessors?: number;
}

export interface NinjaNetworkInterface {
  deviceId: number;
  name?: string;
  adapterName?: string;
  ipAddress?: string;
  macAddress?: string;
  speed?: number;
}

export interface NinjaSoftware {
  deviceId: number;
  name?: string;
  publisher?: string;
  version?: string;
  installDate?: string;
  size?: number;
  location?: string;
}

export interface NinjaOsPatch {
  deviceId: number;
  name?: string;
  kbNumber?: string;
  severity?: string;
  status?: string;
  type?: string;
  installedOn?: number;
}

export interface NinjaWindowsService {
  deviceId: number;
  serviceId?: string;
  serviceName?: string;
  displayName?: string;
  state?: string;
  startType?: string;
  userName?: string;
}

export interface NinjaLastLoggedOnUser {
  deviceId: number;
  userName?: string;
  logonTime?: number;
}
```

### Step 2: Create API layer

Create `src/lib/ninja.ts`:

```typescript
import type {
  NinjaOrganization,
  NinjaOrganizationDetailed,
  NinjaDevice,
  NinjaAlert,
  NinjaDisk,
  NinjaVolume,
  NinjaProcessor,
  NinjaNetworkInterface,
  NinjaSoftware,
  NinjaOsPatch,
  NinjaWindowsService,
  NinjaLastLoggedOnUser,
} from "@/lib/types/ninja";

const NINJA_CLIENT_ID = process.env.NINJA_CLIENT_ID!;
const NINJA_CLIENT_SECRET = process.env.NINJA_CLIENT_SECRET!;
const NINJA_SCOPE = process.env.NINJA_SCOPE || "management";
const NINJA_BASE_URL = process.env.NINJA_BASE_URL || "https://app.ninjarmm.com";

// Global token cache (single token for all orgs)
let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }

  const tokenUrl = `${NINJA_BASE_URL}/ws/oauth/token`;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: NINJA_CLIENT_ID,
    client_secret: NINJA_CLIENT_SECRET,
    scope: NINJA_SCOPE,
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`NinjaOne auth failed: ${error}`);
  }

  const data = await res.json();

  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

async function ninjaFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const url = `${NINJA_BASE_URL}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`NinjaOne API error ${res.status} on ${path}: ${error}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Organizations ──────────────────────────────────────────

export async function getNinjaOrganizations(): Promise<NinjaOrganization[]> {
  return ninjaFetch<NinjaOrganization[]>("/v2/organizations");
}

export async function getNinjaOrgDetail(orgId: number): Promise<NinjaOrganizationDetailed> {
  return ninjaFetch<NinjaOrganizationDetailed>(`/v2/organization/${orgId}`);
}

export async function getNinjaOrgDevices(
  orgId: number,
  pageSize = 50,
  after?: number,
): Promise<NinjaDevice[]> {
  const params = new URLSearchParams({ pageSize: String(pageSize) });
  if (after) params.set("after", String(after));
  return ninjaFetch<NinjaDevice[]>(`/v2/organization/${orgId}/devices?${params}`);
}

// ─── Devices ────────────────────────────────────────────────

export async function getNinjaDevices(
  pageSize = 50,
  after?: number,
  filter?: string,
): Promise<NinjaDevice[]> {
  const params = new URLSearchParams({ pageSize: String(pageSize) });
  if (after) params.set("after", String(after));
  if (filter) params.set("df", filter);
  return ninjaFetch<NinjaDevice[]>(`/v2/devices-detailed?${params}`);
}

export async function getNinjaDeviceDetail(deviceId: number): Promise<NinjaDevice> {
  return ninjaFetch<NinjaDevice>(`/v2/device/${deviceId}`);
}

export async function getNinjaDeviceAlerts(deviceId: number): Promise<NinjaAlert[]> {
  return ninjaFetch<NinjaAlert[]>(`/v2/device/${deviceId}/alerts`);
}

export async function getNinjaDeviceDisks(deviceId: number): Promise<NinjaDisk[]> {
  return ninjaFetch<NinjaDisk[]>(`/v2/device/${deviceId}/disks`);
}

export async function getNinjaDeviceSoftware(deviceId: number): Promise<NinjaSoftware[]> {
  return ninjaFetch<NinjaSoftware[]>(`/v2/device/${deviceId}/software`);
}

export async function getNinjaDeviceOsPatches(deviceId: number): Promise<NinjaOsPatch[]> {
  return ninjaFetch<NinjaOsPatch[]>(`/v2/device/${deviceId}/os-patches`);
}

export async function getNinjaDeviceSoftwarePatches(deviceId: number): Promise<NinjaOsPatch[]> {
  return ninjaFetch<NinjaOsPatch[]>(`/v2/device/${deviceId}/software-patches`);
}

export async function getNinjaDeviceNetInterfaces(deviceId: number): Promise<NinjaNetworkInterface[]> {
  return ninjaFetch<NinjaNetworkInterface[]>(`/v2/device/${deviceId}/network-interfaces`);
}

export async function getNinjaDeviceProcessors(deviceId: number): Promise<NinjaProcessor[]> {
  return ninjaFetch<NinjaProcessor[]>(`/v2/device/${deviceId}/processors`);
}

export async function getNinjaDeviceVolumes(deviceId: number): Promise<NinjaVolume[]> {
  return ninjaFetch<NinjaVolume[]>(`/v2/device/${deviceId}/volumes`);
}

export async function getNinjaDeviceWindowsServices(deviceId: number): Promise<NinjaWindowsService[]> {
  return ninjaFetch<NinjaWindowsService[]>(`/v2/device/${deviceId}/windows-services`);
}

export async function getNinjaDeviceLastUser(deviceId: number): Promise<NinjaLastLoggedOnUser | null> {
  try {
    return await ninjaFetch<NinjaLastLoggedOnUser>(`/v2/device/${deviceId}/last-logged-on-user`);
  } catch {
    return null;
  }
}

export async function getNinjaAlerts(): Promise<NinjaAlert[]> {
  return ninjaFetch<NinjaAlert[]>("/v2/alerts");
}

// ─── Device Actions ─────────────────────────────────────────

export async function rebootDevice(
  deviceId: number,
  mode: "NORMAL" | "FORCED",
  reason?: string,
): Promise<void> {
  await ninjaFetch(`/v2/device/${deviceId}/reboot/${mode}`, {
    method: "POST",
    body: JSON.stringify({ reason: reason || "" }),
  });
}

export async function runDeviceScript(
  deviceId: number,
  scriptId: number,
  parameters?: string,
): Promise<void> {
  await ninjaFetch(`/v2/device/${deviceId}/script/run`, {
    method: "POST",
    body: JSON.stringify({
      type: "SCRIPT",
      id: scriptId,
      parameters: parameters || "",
    }),
  });
}

export async function setDeviceMaintenance(
  deviceId: number,
  endTime: number,
  reason?: string,
  disabledFeatures?: string[],
): Promise<void> {
  await ninjaFetch(`/v2/device/${deviceId}/maintenance`, {
    method: "PUT",
    body: JSON.stringify({
      disabledFeatures: disabledFeatures || ["ALERTS", "PATCHING"],
      end: endTime,
      reasonMessage: reason || "",
    }),
  });
}

export async function cancelDeviceMaintenance(deviceId: number): Promise<void> {
  await ninjaFetch(`/v2/device/${deviceId}/maintenance`, { method: "DELETE" });
}

export async function scanOsPatches(deviceId: number): Promise<void> {
  await ninjaFetch(`/v2/device/${deviceId}/patch/os/scan`, { method: "POST" });
}

export async function applyOsPatches(deviceId: number): Promise<void> {
  await ninjaFetch(`/v2/device/${deviceId}/patch/os/apply`, { method: "POST" });
}

export async function scanSoftwarePatches(deviceId: number): Promise<void> {
  await ninjaFetch(`/v2/device/${deviceId}/patch/software/scan`, { method: "POST" });
}

export async function applySoftwarePatches(deviceId: number): Promise<void> {
  await ninjaFetch(`/v2/device/${deviceId}/patch/software/apply`, { method: "POST" });
}

export async function controlWindowsService(
  deviceId: number,
  serviceId: string,
  action: "START" | "PAUSE" | "STOP" | "RESTART",
): Promise<void> {
  await ninjaFetch(`/v2/device/${deviceId}/windows-service/${serviceId}/control`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}
```

### Step 3: Add env vars to `.env.local`

```bash
NINJA_CLIENT_ID=<your-client-id>
NINJA_CLIENT_SECRET=<your-client-secret>
NINJA_SCOPE=management
NINJA_BASE_URL=https://app.ninjarmm.com
```

### Step 4: Verify build

```bash
npx tsc --noEmit
```

### Step 5: Commit

```bash
git add src/lib/ninja.ts src/lib/types/ninja.ts
git commit -m "feat: add NinjaOne API layer with auth, read functions, and device actions"
```

---

## Task 3: Sidebar Restructure

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

**Step 1:** Replace the flat `navItems` array with a grouped structure. Add new icons imports (`Monitor`, `ChevronDown`). Create collapsible group headers with localStorage persistence.

The sidebar should render:
1. Dashboard (standalone, no group)
2. MSP group (collapsible) — all 14 current items except Dashboard and Settings
3. RMM group (collapsible) — Tenants, Devices, Settings (3 items)
4. Settings (standalone, no group)
5. Favorites section (unchanged)

Use `Monitor` icon for RMM items and keep existing icons for MSP items. RMM nav items:
- `{ href: "/dashboard/rmm/tenants", label: "Tenants", icon: Building2 }`
- `{ href: "/dashboard/rmm/devices", label: "Devices", icon: Monitor }`
- `{ href: "/dashboard/rmm/settings", label: "Settings", icon: Settings }`

Group collapse state stored in `localStorage` under key `sidebar-groups`.

**Step 2:** Verify build

```bash
npx tsc --noEmit
npm run build
```

**Step 3:** Commit

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: restructure sidebar into collapsible MSP and RMM groups"
```

---

## Task 4: RMM Settings — Tenant ↔ Org Linking

**Files:**
- Create: `src/app/dashboard/rmm/settings/page.tsx`
- Create: `src/app/dashboard/rmm/settings/actions.ts`
- Create: `src/components/ninja-link-table.tsx`

### Step 1: Create server actions

Create `src/app/dashboard/rmm/settings/actions.ts`:

- `linkTenantToNinjaOrg(tenantId: number, ninjaOrgId: number, ninjaOrgName: string)` — ADMIN only. Updates Tenant record with ninjaOrgId + ninjaOrgName. Audit logs the linking.
- `unlinkTenantFromNinjaOrg(tenantId: number)` — ADMIN only. Sets ninjaOrgId/ninjaOrgName to null. Audit logs the unlinking.

### Step 2: Create the linking table component

Create `src/components/ninja-link-table.tsx`:

Client component that receives `tenants` (with current ninjaOrgId/ninjaOrgName) and `ninjaOrgs` (from API). Renders a table:
- Column 1: Tenant name + abbreviation
- Column 2: Dropdown of NinjaOne organizations (with current selection)
- Column 3: Status badge (green "Linked" / gray "Not linked")
- Column 4: Save/Unlink buttons

Each row is independently saveable. Uses `useActionState` for form submission feedback.

### Step 3: Create the page

Create `src/app/dashboard/rmm/settings/page.tsx`:

Server component. `requireRole("ADMIN")`. Fetches tenants from Prisma and organizations from `getNinjaOrganizations()`. Passes both to `<NinjaLinkTable />`.

### Step 4: Verify build

```bash
npx tsc --noEmit
npm run build
```

### Step 5: Commit

```bash
git add src/app/dashboard/rmm/settings/ src/components/ninja-link-table.tsx
git commit -m "feat: add RMM settings page for tenant-to-NinjaOne org linking"
```

---

## Task 5: RMM Tenants — Organization List & Detail

**Files:**
- Create: `src/app/dashboard/rmm/tenants/page.tsx`
- Create: `src/app/dashboard/rmm/tenants/[orgId]/page.tsx`
- Create: `src/components/ninja-org-card.tsx`
- Create: `src/app/api/ninja/organizations/route.ts`
- Create: `src/app/api/ninja/organizations/[orgId]/route.ts`
- Create: `src/app/api/ninja/organizations/[orgId]/devices/route.ts`

### Step 1: Create API routes

**`/api/ninja/organizations`** (GET) — Auth-gated. Calls `getNinjaOrganizations()`. Returns JSON array.

**`/api/ninja/organizations/[orgId]`** (GET) — Auth-gated. Calls `getNinjaOrgDetail(orgId)`. Returns JSON.

**`/api/ninja/organizations/[orgId]/devices`** (GET) — Auth-gated. Accepts `?pageSize=&after=` query params. Calls `getNinjaOrgDevices(orgId, pageSize, after)`. Returns JSON array.

### Step 2: Create org card component

Create `src/components/ninja-org-card.tsx`:

Displays org name, description, device count, and a badge showing if it's linked to a Microsoft Tenant (query from props). Uses same card styling as existing tenant cards (`var(--bg-card)`, `var(--border)`, hover effect).

### Step 3: Create org list page

Create `src/app/dashboard/rmm/tenants/page.tsx`:

Server component. `requireRole("VIEWER")`. Fetches organizations from API + tenants with ninjaOrgId from Prisma. Renders card grid with `<NinjaOrgCard />` for each org. Shows linked tenant name if matched.

### Step 4: Create org detail page

Create `src/app/dashboard/rmm/tenants/[orgId]/page.tsx`:

Server component. `requireRole("VIEWER")`. Fetches org detail + org devices. Displays:
- Org info header (name, description, approval mode)
- Stats row: total devices, online count, offline count, by type breakdown
- Device table (reuse DataTable pattern): Name, Type, Status, OS, Last Contact — each row links to `/dashboard/rmm/devices/[deviceId]`

### Step 5: Verify build

```bash
npx tsc --noEmit
npm run build
```

### Step 6: Commit

```bash
git add src/app/dashboard/rmm/tenants/ src/app/api/ninja/organizations/ src/components/ninja-org-card.tsx
git commit -m "feat: add RMM tenants pages with org list, detail, and device table"
```

---

## Task 6: RMM Devices — Global List & Detail

**Files:**
- Create: `src/app/dashboard/rmm/devices/page.tsx`
- Create: `src/app/dashboard/rmm/devices/[deviceId]/page.tsx`
- Create: `src/components/ninja-device-table.tsx`
- Create: `src/components/ninja-device-detail.tsx`
- Create: `src/app/api/ninja/devices/route.ts`
- Create: `src/app/api/ninja/devices/[deviceId]/route.ts`
- Create: `src/app/api/ninja/devices/[deviceId]/alerts/route.ts`
- Create: `src/app/api/ninja/devices/[deviceId]/software/route.ts`
- Create: `src/app/api/ninja/devices/[deviceId]/hardware/route.ts`
- Create: `src/app/api/ninja/devices/[deviceId]/patches/route.ts`
- Create: `src/app/api/ninja/devices/[deviceId]/services/route.ts`

### Step 1: Create device API routes

**`/api/ninja/devices`** (GET) — Auth-gated. Accepts `?pageSize=&after=&df=` query params. Calls `getNinjaDevices()`.

**`/api/ninja/devices/[deviceId]`** (GET) — Auth-gated. Calls `getNinjaDeviceDetail()`.

**`/api/ninja/devices/[deviceId]/alerts`** (GET) — Calls `getNinjaDeviceAlerts()`.

**`/api/ninja/devices/[deviceId]/software`** (GET) — Calls `getNinjaDeviceSoftware()`.

**`/api/ninja/devices/[deviceId]/hardware`** (GET) — Calls `getNinjaDeviceProcessors()`, `getNinjaDeviceVolumes()`, `getNinjaDeviceNetInterfaces()` with `Promise.allSettled()`. Returns combined `{ processors, volumes, networkInterfaces }`.

**`/api/ninja/devices/[deviceId]/patches`** (GET) — Calls `getNinjaDeviceOsPatches()`, `getNinjaDeviceSoftwarePatches()` with `Promise.allSettled()`. Returns `{ osPatches, softwarePatches }`.

**`/api/ninja/devices/[deviceId]/services`** (GET) — Calls `getNinjaDeviceWindowsServices()`.

### Step 2: Create device table component

Create `src/components/ninja-device-table.tsx`:

Client component. Fetches from `/api/ninja/devices`. Displays DataTable with columns: Name, Organization, Type (nodeClass badge), Status (online/offline dot), OS, Last Contact (relative time). Filters: organization dropdown, type dropdown, status toggle. Search by name. Pagination via cursor (after param).

### Step 3: Create device detail component

Create `src/components/ninja-device-detail.tsx`:

Client component that receives `deviceId` as prop. Fetches device detail + all sub-data on mount. Renders collapsible sections:

1. **Overview** — displayName, systemName, OS, nodeClass, org, lastContact, publicIP, status, maintenance status
2. **Hardware** — Processors table, Volumes table (capacity + free space with bar), Disks
3. **Network** — Network interfaces table (name, IP, MAC, speed)
4. **Software** — Software table (name, publisher, version, install date) with search
5. **Patches** — Two tabs: OS Patches + Software Patches (name, severity, status)
6. **Services** — Windows services table (name, state with badge, start type) — with Start/Stop/Restart buttons (Task 7)
7. **Alerts** — Active alerts table (message, severity, source, time)
8. **Assignment** — Shows assigned AD User if any, with change/remove controls (Task 8)

### Step 4: Create device list page

Create `src/app/dashboard/rmm/devices/page.tsx`:

Server component. `requireRole("VIEWER")`. Renders `<NinjaDeviceTable />`.

### Step 5: Create device detail page

Create `src/app/dashboard/rmm/devices/[deviceId]/page.tsx`:

Server component. `requireRole("VIEWER")`. Passes `deviceId` param. Renders `<NinjaDeviceDetail deviceId={deviceId} role={role} />`.

### Step 6: Verify build

```bash
npx tsc --noEmit
npm run build
```

### Step 7: Commit

```bash
git add src/app/dashboard/rmm/devices/ src/app/api/ninja/devices/ src/components/ninja-device-table.tsx src/components/ninja-device-detail.tsx
git commit -m "feat: add RMM devices pages with global list, detail view, and hardware/software/patch sections"
```

---

## Task 7: Device Actions

**Files:**
- Create: `src/components/ninja-device-actions.tsx`
- Create: `src/app/api/ninja/devices/[deviceId]/reboot/route.ts`
- Create: `src/app/api/ninja/devices/[deviceId]/maintenance/route.ts`
- Create: `src/app/api/ninja/devices/[deviceId]/patch-scan/route.ts`
- Create: `src/app/api/ninja/devices/[deviceId]/patch-apply/route.ts`
- Create: `src/app/api/ninja/devices/[deviceId]/script/route.ts`
- Create: `src/app/api/ninja/devices/[deviceId]/services/[serviceId]/control/route.ts`
- Modify: `src/components/ninja-device-detail.tsx` (wire actions)

### Step 1: Create action API routes

All action routes require EDITOR+ role and audit log the action.

**`/api/ninja/devices/[deviceId]/reboot`** (POST) — Body: `{ mode: "NORMAL"|"FORCED", reason?: string }`. Calls `rebootDevice()`.

**`/api/ninja/devices/[deviceId]/maintenance`** (PUT) — Body: `{ endTime: number, reason?: string, disabledFeatures?: string[] }`. Calls `setDeviceMaintenance()`. (DELETE) — Calls `cancelDeviceMaintenance()`.

**`/api/ninja/devices/[deviceId]/patch-scan`** (POST) — Body: `{ type: "os"|"software"|"both" }`. Calls `scanOsPatches()` and/or `scanSoftwarePatches()`.

**`/api/ninja/devices/[deviceId]/patch-apply`** (POST) — Body: `{ type: "os"|"software"|"both" }`. Calls `applyOsPatches()` and/or `applySoftwarePatches()`.

**`/api/ninja/devices/[deviceId]/script`** (POST) — Body: `{ scriptId: number, parameters?: string }`. Calls `runDeviceScript()`.

**`/api/ninja/devices/[deviceId]/services/[serviceId]/control`** (POST) — Body: `{ action: "START"|"PAUSE"|"STOP"|"RESTART" }`. Calls `controlWindowsService()`.

### Step 2: Create actions component

Create `src/components/ninja-device-actions.tsx`:

Client component for EDITOR+ only. Renders action buttons in an actions bar:
- **Reboot** — Two-step confirm dialog (Normal/Forced mode selector + reason input)
- **Maintenance** — Toggle: if active shows "Cancel", if not shows form (duration picker + reason)
- **Patch Scan** — Button with dropdown (OS / Software / Both)
- **Patch Apply** — Button with dropdown (OS / Software / Both), two-step confirm
- **Run Script** — Modal with script ID input + parameters textarea

Each action shows loading state during execution and success/error toast feedback.

### Step 3: Wire into device detail

Modify `src/components/ninja-device-detail.tsx`:
- Add `<NinjaDeviceActions deviceId={deviceId} role={role} />` in the Actions section
- Wire service Start/Stop/Restart buttons in the Services section to call the control API

### Step 4: Verify build

```bash
npx tsc --noEmit
npm run build
```

### Step 5: Commit

```bash
git add src/components/ninja-device-actions.tsx src/app/api/ninja/devices/ src/components/ninja-device-detail.tsx
git commit -m "feat: add device actions (reboot, maintenance, patches, scripts, service control)"
```

---

## Task 8: Device Assignment — AD User ↔ Device

**Files:**
- Create: `src/components/ninja-device-assignment.tsx`
- Create: `src/app/dashboard/rmm/devices/actions.ts`
- Modify: `src/components/ninja-device-detail.tsx` (wire assignment section)

### Step 1: Create server actions

Create `src/app/dashboard/rmm/devices/actions.ts`:

- `assignDeviceToUser(tenantId, ninjaDeviceId, ninjaDeviceName, adUserUpn, adUserName)` — EDITOR+. Creates DeviceAssignment record. Audit logs. Returns the created assignment.
- `unassignDevice(assignmentId)` — EDITOR+. Deletes DeviceAssignment. Audit logs.

### Step 2: Create assignment component

Create `src/components/ninja-device-assignment.tsx`:

Client component. Receives `deviceId`, `tenantId` (derived from device's organizationId → linked Tenant), `role`.

- Shows current assignment if exists (user name + UPN, with Unassign button for EDITOR+)
- For EDITOR+: "Assign User" button opens a dropdown that:
  1. Fetches AD users for the linked tenant (reuses `/api/tenants/[id]/users` endpoint)
  2. Searchable dropdown to pick user
  3. On select → calls `assignDeviceToUser` server action
- If device's org has no linked tenant: shows "Organization not linked to any tenant" message

### Step 3: Wire into device detail

Modify `src/components/ninja-device-detail.tsx`:
- In the Assignment section, render `<NinjaDeviceAssignment />`
- Pass `deviceId`, the org's linked `tenantId`, and `role`

### Step 4: Verify build

```bash
npx tsc --noEmit
npm run build
```

### Step 5: Commit

```bash
git add src/components/ninja-device-assignment.tsx src/app/dashboard/rmm/devices/actions.ts src/components/ninja-device-detail.tsx
git commit -m "feat: add device-to-AD-user assignment with tenant linking"
```

---

## Task 9: Final Verification and Memory Update

**Files:**
- Modify: `/home/ardepa/.claude/projects/-home-ardepa/memory/tum2026.md`

### Step 1: Full build verification

```bash
npm run build
```

Expected: 0 errors, all new routes visible in the output.

### Step 2: Update memory file

Add to `tum2026.md`:
- New env vars (NINJA_*)
- New model (DeviceAssignment)
- Updated Tenant model fields
- New lib files (ninja.ts, types/ninja.ts)
- New pages under /dashboard/rmm/
- New API routes under /api/ninja/
- New components (6)
- Sidebar restructure note
- Migration record

### Step 3: Commit memory update (if applicable)

### Step 4: Apply migration to Neon.tech production

```bash
DATABASE_URL="<neon_url>" npx prisma migrate deploy
```

### Step 5: Push to GitHub + deploy

```bash
git checkout main
git merge feat/ninjaone-rmm-integration --no-ff
git push origin main
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 0 | Feature branch | 0 |
| 1 | Prisma schema migration | 1 modified |
| 2 | NinjaOne API layer | 2 created |
| 3 | Sidebar restructure | 1 modified |
| 4 | RMM Settings (linking) | 3 created |
| 5 | RMM Tenants (org list + detail) | 6 created |
| 6 | RMM Devices (list + detail) | 11 created |
| 7 | Device actions | 7 created, 1 modified |
| 8 | Device assignment | 2 created, 1 modified |
| 9 | Final verification + deploy | memory update |
| **Total** | | **~32 new files, ~3 modified** |
