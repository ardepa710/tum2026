# Sophos Central Integration + NinjaOne Cross-Link — Design Document

**Date:** 2026-02-22
**Author:** Claude + ardepa
**Status:** Approved

---

## Overview

Integrate Sophos Central API into TUM2026 for endpoint security monitoring and management. Includes a cross-link system between NinjaOne devices and Sophos endpoints to provide a unified device view across RMM and Security platforms.

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Sidebar placement | New "Security" collapsible group | Separate from MSP and RMM — security is a distinct domain |
| Credential type | Partner (MSP) credentials | Can see and query all managed tenants |
| Cross-link scope | Per-tenant only | A device from Tenant A cannot be linked to an endpoint from Tenant B |
| Alert integration | Integrate into existing /dashboard/alerts | Single pane of glass for all alerts |
| Actions scope | Read-only + scan + tamper toggle | Conservative start; isolation and policy changes deferred |
| Tenant linking | Auto-discovery via Partner API | Fetch tenants from Sophos, admin selects matches in dropdown |
| apiHost storage | On Tenant model | Single source of truth for Sophos routing per tenant |

---

## 1. Authentication Architecture

### OAuth2 Client Credentials Flow

```
1. POST https://id.sophos.com/api/v2/oauth2/token
   Body: grant_type=client_credentials, client_id, client_secret, scope=token
   Response: { access_token (JWT), expires_in: 3600, token_type: "bearer" }

2. GET https://api.central.sophos.com/whoami/v1
   Header: Authorization: Bearer {token}
   Response: { id: "<partner-uuid>", idType: "partner", apiHosts: { global: "https://api.central.sophos.com" } }

3. GET https://api.central.sophos.com/partner/v1/tenants
   Headers: Authorization + X-Partner-ID: {partnerId}
   Response: { items: [{ id, name, dataRegion, apiHost, status }] }

4. Per-tenant API calls:
   Base URL: tenant.apiHost (e.g., https://api-us03.central.sophos.com)
   Headers: Authorization + X-Tenant-ID: {sophosTenantId}
```

### Token Cache

Global in-memory cache with 60-second safety margin (same pattern as NinjaOne):
```typescript
let tokenCache: { token: string; partnerId: string; expiresAt: number } | null = null;
```

### Environment Variables (2 required)

```
SOPHOS_CLIENT_ID      — Partner API client ID
SOPHOS_CLIENT_SECRET  — Partner API client secret
```

---

## 2. Database Schema

### Migration: `add_sophos_and_cross_links`

#### Tenant model — 3 new fields

```prisma
sophosOrgId    String?  @map("sophos_org_id")     // UUID from Sophos
sophosRegion   String?  @map("sophos_region")      // e.g., "us03", "eu02"
sophosApiHost  String?  @map("sophos_api_host")    // e.g., "https://api-us03.central.sophos.com"
```

#### New model: DeviceCrossLink

```prisma
model DeviceCrossLink {
  id                 Int      @id @default(autoincrement())
  tenantId           Int
  tenant             Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  ninjaDeviceId      Int
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

Bidirectional unique constraints enforce 1:1 relationship per tenant.

---

## 3. API Client (`src/lib/sophos.ts`)

### Functions (17 total)

| Function | Method | Path | Purpose |
|----------|--------|------|---------|
| `getAccessToken()` | POST | `id.sophos.com/api/v2/oauth2/token` | OAuth2 token |
| `getWhoAmI()` | GET | `/whoami/v1` | Discover partner ID |
| `getSophosPartnerTenants()` | GET | `/partner/v1/tenants` | Auto-discovery for linking |
| `sophosFetch<T>(tenantDbId, path, init?)` | — | — | Generic per-tenant helper |
| `getSophosEndpoints(tenantDbId, filters?)` | GET | `/endpoint/v1/endpoints` | List endpoints |
| `getSophosEndpoint(tenantDbId, endpointId)` | GET | `/endpoint/v1/endpoints/{id}` | Endpoint detail |
| `getSophosEndpointTamper(tenantDbId, endpointId)` | GET | `/endpoint/v1/endpoints/{id}/tamper-protection` | Tamper status |
| `setSophosEndpointTamper(tenantDbId, endpointId, enabled)` | POST | `/endpoint/v1/endpoints/{id}/tamper-protection` | Toggle tamper |
| `startSophosScan(tenantDbId, endpointId)` | POST | `/endpoint/v1/endpoints/{id}/scans` | Start scan |
| `getSophosEndpointIsolation(tenantDbId, endpointId)` | GET | `/endpoint/v1/endpoints/{id}/isolation` | Isolation status (read-only) |
| `getSophosAlerts(tenantDbId, filters?)` | GET | `/common/v1/alerts` | Tenant alerts |
| `getSophosAlert(tenantDbId, alertId)` | GET | `/common/v1/alerts/{id}` | Alert detail |
| `getSophosHealthCheck(tenantDbId)` | GET | `/account-health-check/v1/health-check` | Security posture |
| `getSophosEndpointGroups(tenantDbId)` | GET | `/endpoint/v1/endpoint-groups` | List groups |
| `getSophosGroupDetail(tenantDbId, groupId)` | GET | `/endpoint/v1/endpoint-groups/{id}` | Group detail |
| `getSophosGroupEndpoints(tenantDbId, groupId)` | GET | `/endpoint/v1/endpoint-groups/{id}/endpoints` | Group members |
| `getSophosPolicies(tenantDbId)` | GET | `/endpoint/v1/policies/settings` | Policies (read-only) |

Note: `tenantDbId` is the TUM Tenant integer ID. The function looks up `sophosTenantId` and `sophosApiHost` from the DB internally.

---

## 4. TypeScript Types (`src/lib/types/sophos.ts`)

```typescript
// Partner/Tenant
interface SophosTenant { id: string; name: string; dataRegion: string; apiHost: string; status: string; }
interface SophosWhoAmI { id: string; idType: "partner" | "organization" | "tenant"; apiHosts: { global: string } }

// Endpoints
interface SophosEndpoint {
  id: string; type: "computer" | "server";
  hostname: string; ipv4Addresses: string[]; macAddresses: string[];
  os: { name: string; platform: string; majorVersion: number; };
  health: { overall: "good" | "suspicious" | "bad" | "unknown"; threats: { status: string } };
  tamperProtectionEnabled: boolean;
  isolation: { status: "isolated" | "notIsolated"; };
  associatedPerson: { viaLogin: string; };
  lastSeenAt: string;
  assignedProducts: SophosProduct[];
}
interface SophosProduct { code: string; version: string; status: string; }
interface SophosTamperProtection { enabled: boolean; password?: string; }

// Alerts
interface SophosAlert {
  id: string; category: string; type: string; severity: "high" | "medium" | "low";
  description: string; product: string;
  managedAgent: { id: string; type: string; };
  raisedAt: string; allowedActions: string[];
  tenant?: { id: string; name: string; }; // enriched client-side
}

// Health Check
interface SophosHealthCheck {
  endpoint: {
    protection: SophosCheckResult; policy: SophosCheckResult;
    exclusions: SophosCheckResult; tamperProtection: SophosCheckResult;
  };
}
interface SophosCheckResult { status: "green" | "amber" | "red"; summary: string; }

// Groups
interface SophosEndpointGroup {
  id: string; name: string; description: string; type: "default" | "custom";
  endpoints: { itemsCount: number; };
}

// Pagination
interface SophosPaginatedResponse<T> { items: T[]; pages: { current: number; total: number; size: number; } }
```

---

## 5. Client-Safe Utils (`src/lib/sophos-utils.ts`)

```typescript
sophosHealthColor(health: string)      // "good"→green, "suspicious"→yellow, "bad"→red
sophosHealthLabel(health: string)      // "good"→"Healthy", "suspicious"→"Suspicious", etc.
sophosSeverityColor(severity: string)  // "high"→red, "medium"→orange, "low"→yellow
sophosEndpointTypeLabel(type: string)  // "computer"→"Workstation", "server"→"Server"
sophosCheckColor(status: string)       // "green"→green, "amber"→yellow, "red"→red
formatSophosTime(iso: string)          // ISO 8601 → relative time ("5m ago")
```

No server imports — safe for both client and server components.

---

## 6. Pages (6 new)

| Route | Role | Description |
|-------|------|-------------|
| `/dashboard/sophos/settings` | ADMIN | Link table: TUM Tenant ↔ Sophos Tenant (auto-discovery dropdown) |
| `/dashboard/sophos/endpoints` | VIEWER | Global endpoint list cross-tenant with filters (tenant, OS, health, tamper, type, group, search) |
| `/dashboard/sophos/endpoints/[endpointId]` | VIEWER | Endpoint detail with collapsible sections + actions + cross-link |
| `/dashboard/sophos/tenants/[tenantId]` | VIEWER | Endpoints + health check of a specific tenant |
| `/dashboard/sophos/groups` | VIEWER | Endpoint groups cross-tenant, card grid with endpoint counts |
| `/dashboard/sophos/groups/[groupId]` | VIEWER | Group detail: info + member endpoints table |

---

## 7. Components (12 new)

| Component | Type | Description |
|-----------|------|-------------|
| `sophos-link-table.tsx` | Client | Linking Tenant ↔ Sophos tenant (pattern: ninja-link-table) |
| `sophos-endpoint-table.tsx` | Client | Table with filters: tenant, OS, health, tamper, type, group, search |
| `sophos-endpoint-detail.tsx` | Client | 6 collapsible sections: overview, protection, health, isolation, groups, cross-link |
| `sophos-endpoint-actions.tsx` | Client | Scan + tamper toggle (EDITOR+) |
| `sophos-health-badge.tsx` | Client | Color-coded badge: good/suspicious/bad/unknown |
| `sophos-severity-badge.tsx` | Client | Badge for alert severity: high/medium/low |
| `sophos-cross-link-section.tsx` | Client | In endpoint detail: view/link NinjaOne device |
| `ninja-cross-link-section.tsx` | Client | In NinjaOne device detail: view/link Sophos endpoint |
| `cross-link-manager.tsx` | Client | Cross-link table + auto-match button (in sophos/settings) |
| `sophos-tenant-card.tsx` | Client | Tenant card with health check summary |
| `sophos-group-card.tsx` | Client | Group card with name, type, endpoint count, tenant badge |
| `sophos-group-detail.tsx` | Client | Group info + member endpoints table |

---

## 8. API Routes (17 new)

### Sophos Read (10)

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/sophos/tenants` | Auto-discovery: list partner tenants |
| GET | `/api/sophos/endpoints?tenantId=X` | Endpoints of a tenant |
| GET | `/api/sophos/endpoints/[endpointId]?tenantId=X` | Endpoint detail |
| GET | `/api/sophos/endpoints/[endpointId]/tamper?tenantId=X` | Tamper status |
| GET | `/api/sophos/alerts?tenantId=X` | Tenant alerts |
| GET | `/api/sophos/health?tenantId=X` | Health check |
| GET | `/api/sophos/groups?tenantId=X` | Endpoint groups |
| GET | `/api/sophos/groups/[groupId]?tenantId=X` | Group detail |
| GET | `/api/sophos/groups/[groupId]/endpoints?tenantId=X` | Group member endpoints |
| GET | `/api/sophos/policies?tenantId=X` | Policies (read-only) |

### Sophos Actions (2)

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/sophos/endpoints/[endpointId]/scan` | Start scan (EDITOR+) |
| POST | `/api/sophos/endpoints/[endpointId]/tamper` | Toggle tamper (EDITOR+) |

### Cross-Links (4)

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/cross-links?tenantId=X` | List cross-links |
| POST | `/api/cross-links` | Create manual link |
| DELETE | `/api/cross-links/[id]` | Delete link |
| POST | `/api/cross-links/auto-match?tenantId=X` | Auto-match by hostname |

---

## 9. Server Actions (3 files)

### `/dashboard/sophos/settings/actions.ts`
- `linkTenantToSophos(formData)` — ADMIN, saves sophosOrgId + sophosRegion + sophosApiHost
- `unlinkTenantFromSophos(formData)` — ADMIN, nulls all 3 fields

### `/dashboard/sophos/endpoints/actions.ts`
- `startScan(tenantId, endpointId)` — EDITOR+
- `toggleTamper(tenantId, endpointId, enabled)` — EDITOR+

### `/dashboard/sophos/cross-links/actions.ts`
- `createCrossLink(tenantId, ninjaDeviceId, ninjaDeviceName, sophosEndpointId, sophosEndpointName)` — EDITOR+
- `deleteCrossLink(crossLinkId)` — EDITOR+
- `autoMatchByHostname(tenantId)` — ADMIN, returns suggested matches
- `bulkCreateCrossLinks(matches[])` — ADMIN, creates multiple links

---

## 10. Sidebar Structure

New "Security" collapsible group added to sidebar:

```
Dashboard (standalone)
─────────
MSP (collapsible)
├── Tenants, Users, Groups, Licenses, Tasks, Task Runs,
│   Permissions, Technicians, Runbooks, Alerts, Service Health,
│   Security, Audit Logs, Reports
─────────
RMM (collapsible)
├── Tenants, Devices, Settings
─────────
Security (collapsible)        ← NEW
├── Endpoints
├── Groups
├── Settings
─────────
Settings (standalone)
```

Group collapse state persisted in localStorage (existing `sidebar-groups` key).

---

## 11. Alert Integration

Extend `src/lib/alerts.ts` to include Sophos alerts:

1. Fetch alerts from each Sophos-linked tenant
2. Map severity: `high` → error, `medium` → warning, `low` → info
3. Add to existing alerts array with `source: "sophos"` identifier
4. Sophos alerts appear in `/dashboard/alerts` alongside existing alerts (failed runs, low health, stale sync, service degradation)

---

## 12. Cross-Link: Auto-Match Flow

```
1. Admin opens Settings → "Cross-Links" tab
2. Clicks "Auto-match by hostname"
3. System fetches NinjaOne devices for the tenant (via NinjaOne API)
4. System fetches Sophos endpoints for the tenant (via Sophos API)
5. Matches: device.systemName.toLowerCase() === endpoint.hostname.toLowerCase()
6. Preview: table showing found matches with checkboxes
7. Admin selects/deselects → clicks "Link selected"
8. Bulk create DeviceCrossLink records
9. Audit log: CROSS_LINK_AUTO_MATCH, details: { count: N, tenantId }
```

---

## 13. RBAC Matrix

| Role | Settings | Endpoints | Actions | Groups | Cross-Links |
|------|----------|-----------|---------|--------|-------------|
| ADMIN | Link/unlink tenants | View all | Scan + tamper | View all | Auto-match bulk + manual |
| EDITOR | — | View all | Scan + tamper | View all | Manual link/unlink |
| VIEWER | — | View all | — | View all | View (read-only) |

---

## 14. File Inventory

### New files (estimated: ~35)

**Lib (4):**
- `src/lib/sophos.ts`
- `src/lib/types/sophos.ts`
- `src/lib/sophos-utils.ts`
- (modify) `src/lib/alerts.ts`

**Pages (6):**
- `src/app/dashboard/sophos/settings/page.tsx`
- `src/app/dashboard/sophos/endpoints/page.tsx`
- `src/app/dashboard/sophos/endpoints/[endpointId]/page.tsx`
- `src/app/dashboard/sophos/tenants/[tenantId]/page.tsx`
- `src/app/dashboard/sophos/groups/page.tsx`
- `src/app/dashboard/sophos/groups/[groupId]/page.tsx`

**Server Actions (3):**
- `src/app/dashboard/sophos/settings/actions.ts`
- `src/app/dashboard/sophos/endpoints/actions.ts`
- `src/app/dashboard/sophos/cross-links/actions.ts`

**API Routes (17):**
- `src/app/api/sophos/tenants/route.ts`
- `src/app/api/sophos/endpoints/route.ts`
- `src/app/api/sophos/endpoints/[endpointId]/route.ts`
- `src/app/api/sophos/endpoints/[endpointId]/tamper/route.ts`
- `src/app/api/sophos/endpoints/[endpointId]/scan/route.ts`
- `src/app/api/sophos/alerts/route.ts`
- `src/app/api/sophos/health/route.ts`
- `src/app/api/sophos/groups/route.ts`
- `src/app/api/sophos/groups/[groupId]/route.ts`
- `src/app/api/sophos/groups/[groupId]/endpoints/route.ts`
- `src/app/api/sophos/policies/route.ts`
- `src/app/api/cross-links/route.ts`
- `src/app/api/cross-links/[id]/route.ts`
- `src/app/api/cross-links/auto-match/route.ts`

**Components (12):**
- `src/components/sophos-link-table.tsx`
- `src/components/sophos-endpoint-table.tsx`
- `src/components/sophos-endpoint-detail.tsx`
- `src/components/sophos-endpoint-actions.tsx`
- `src/components/sophos-health-badge.tsx`
- `src/components/sophos-severity-badge.tsx`
- `src/components/sophos-cross-link-section.tsx`
- `src/components/ninja-cross-link-section.tsx`
- `src/components/cross-link-manager.tsx`
- `src/components/sophos-tenant-card.tsx`
- `src/components/sophos-group-card.tsx`
- `src/components/sophos-group-detail.tsx`

**Modified files (~5):**
- `prisma/schema.prisma` — Tenant fields + DeviceCrossLink model
- `src/components/layout/sidebar.tsx` — Security group
- `src/lib/alerts.ts` — Sophos alert source
- `src/components/ninja-device-detail.tsx` — Cross-link section
- `src/components/bottom-nav.tsx` — Security item (optional)

---

## 15. Key Differences from NinjaOne Integration

| Aspect | NinjaOne | Sophos |
|--------|----------|--------|
| Token | 1 global for all orgs | 1 global but routed by dataRegion |
| Tenant routing | By orgId in URL path | By X-Tenant-ID header + apiHost |
| IDs | Integer (orgId, deviceId) | UUID strings (tenantId, endpointId) |
| Pagination | Cursor-based (after=lastId) | Offset-based (page, pageSize) |
| Linking fields | ninjaOrgId (Int), ninjaOrgName | sophosOrgId (String), sophosRegion, sophosApiHost |
| Auth endpoint | app.ninjarmm.com/ws/oauth/token | id.sophos.com/api/v2/oauth2/token |
| Discovery | Separate API call per org | Partner API lists all tenants at once |
