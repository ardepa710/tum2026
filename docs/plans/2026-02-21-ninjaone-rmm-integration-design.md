# NinjaOne RMM Integration — Design Document

**Date:** 2026-02-21
**Status:** Approved

## Goal

Integrate NinjaOne (NinjaRMM) into TUM2026 to provide RMM capabilities alongside the existing MSP features. Enable organization management, device monitoring, device actions, and linking between Microsoft Tenants and NinjaOne Organizations.

## Architecture

Single API layer file (`src/lib/ninja.ts`) following the same pattern as `graph.ts`. Client Credentials OAuth2 flow with global token cache. NinjaOne uses one token for all organizations (unlike Graph API which uses per-tenant tokens).

**Instance:** US — `https://app.ninjarmm.com`

## Environment Variables

```bash
NINJA_CLIENT_ID=xxx
NINJA_CLIENT_SECRET=xxx
NINJA_SCOPE=management
NINJA_BASE_URL=https://app.ninjarmm.com   # optional, default
```

## Database Changes

### Modified: Tenant model

Add two optional fields for NinjaOne linking:

```prisma
ninjaOrgId    Int?    @map("ninja_org_id")
ninjaOrgName  String? @map("ninja_org_name")
```

### New: DeviceAssignment model

Maps AD Users (from Microsoft Graph) to NinjaOne devices. Uses `adUserUpn` (email) instead of FK to User since AD Users are not stored locally.

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

## Sidebar Restructure

From flat list (16 items) to collapsible groups:

```
Dashboard                     ← global
─────────────────────────
▼ MSP (collapsible)
  Tenants, Users, Groups, Licenses, Tasks, Task Runs,
  Permissions, Technicians, Runbooks, Alerts,
  Service Health, Security, Audit Logs, Reports
─────────────────────────
▼ RMM (collapsible)
  Tenants, Devices, Settings
─────────────────────────
Settings                      ← global
Favorites                     ← unchanged
```

- Collapse state persisted in localStorage
- Mobile: groups collapsed by default

## API Layer — `src/lib/ninja.ts`

### Authentication

Client Credentials flow against `https://app.ninjarmm.com/ws/oauth/token` with scope `management`. Single global token cached with TTL from `expires_in`.

### Read Functions (16)

| Function | Endpoint |
|----------|----------|
| `getNinjaOrganizations()` | GET `/v2/organizations` |
| `getNinjaOrgDetail(orgId)` | GET `/v2/organization/{id}` |
| `getNinjaOrgDevices(orgId)` | GET `/v2/organization/{id}/devices` |
| `getNinjaDevices(filter?)` | GET `/v2/devices-detailed` |
| `getNinjaDeviceDetail(id)` | GET `/v2/device/{id}` |
| `getNinjaDeviceAlerts(id)` | GET `/v2/device/{id}/alerts` |
| `getNinjaDeviceDisks(id)` | GET `/v2/device/{id}/disks` |
| `getNinjaDeviceSoftware(id)` | GET `/v2/device/{id}/software` |
| `getNinjaDeviceOsPatches(id)` | GET `/v2/device/{id}/os-patches` |
| `getNinjaDeviceNetInterfaces(id)` | GET `/v2/device/{id}/network-interfaces` |
| `getNinjaDeviceProcessors(id)` | GET `/v2/device/{id}/processors` |
| `getNinjaDeviceVolumes(id)` | GET `/v2/device/{id}/volumes` |
| `getNinjaDeviceWindowsServices(id)` | GET `/v2/device/{id}/windows-services` |
| `getNinjaDeviceLastUser(id)` | GET `/v2/device/{id}/last-logged-on-user` |
| `getNinjaAlerts()` | GET `/v2/alerts` |
| `getNinjaActivities()` | GET `/v2/activities` |

### Action Functions (9)

| Function | Endpoint |
|----------|----------|
| `rebootDevice(id, mode)` | POST `/v2/device/{id}/reboot/{mode}` |
| `runScript(id, scriptId, params)` | POST `/v2/device/{id}/script/run` |
| `setMaintenance(id, start, end)` | PUT `/v2/device/{id}/maintenance` |
| `cancelMaintenance(id)` | DELETE `/v2/device/{id}/maintenance` |
| `scanOsPatches(id)` | POST `/v2/device/{id}/patch/os/scan` |
| `applyOsPatches(id)` | POST `/v2/device/{id}/patch/os/apply` |
| `scanSoftwarePatches(id)` | POST `/v2/device/{id}/patch/software/scan` |
| `applySoftwarePatches(id)` | POST `/v2/device/{id}/patch/software/apply` |
| `controlWindowsService(id, serviceId, action)` | POST `/v2/device/{id}/windows-service/{serviceId}/control` |

## Pages

### `/dashboard/rmm/settings` — Linking Page (ADMIN only)

Table showing all Microsoft Tenants with dropdown to select corresponding NinjaOne Organization. Writes `ninjaOrgId` + `ninjaOrgName` to Tenant model. Visual badges: green "Linked" / gray "Not linked".

### `/dashboard/rmm/tenants` — Organizations List

Card grid of NinjaOne organizations. Shows: name, device count, linked tenant badge. Click navigates to org detail.

### `/dashboard/rmm/tenants/[orgId]` — Organization Detail

Org info, device table (paginated), stats (total devices, online/offline, by type). Clickable devices open detail.

### `/dashboard/rmm/devices` — Global Devices

DataTable (reuse existing component) with all devices across all orgs. Columns: Name, Org, Type, Status, OS, Last Contact. Filters: organization, type, online/offline. Search by name.

### `/dashboard/rmm/devices/[deviceId]` — Device Detail

Sections/tabs: Overview, Hardware, Network, Software, Patches, Services, Alerts, Assignment (AD User), Actions (Reboot, Maintenance, Patch Scan/Apply, Run Script).

## Components

| Component | Description |
|-----------|-------------|
| `ninja-org-card.tsx` | Organization card for grid view |
| `ninja-device-table.tsx` | DataTable of devices with filters |
| `ninja-device-detail.tsx` | Device detail panel with tabs/sections |
| `ninja-device-actions.tsx` | Action buttons with confirmation dialogs |
| `ninja-link-table.tsx` | Settings linking table |
| `ninja-device-assignment.tsx` | AD User selector for device assignment |

## API Routes (17)

### Read Routes
- GET `/api/ninja/organizations`
- GET `/api/ninja/organizations/[orgId]`
- GET `/api/ninja/organizations/[orgId]/devices`
- GET `/api/ninja/devices`
- GET `/api/ninja/devices/[deviceId]`
- GET `/api/ninja/devices/[deviceId]/alerts`
- GET `/api/ninja/devices/[deviceId]/software`
- GET `/api/ninja/devices/[deviceId]/disks`
- GET `/api/ninja/devices/[deviceId]/patches`
- GET `/api/ninja/devices/[deviceId]/hardware`
- GET `/api/ninja/devices/[deviceId]/services`

### Action Routes
- POST `/api/ninja/devices/[deviceId]/reboot`
- PUT/DELETE `/api/ninja/devices/[deviceId]/maintenance`
- POST `/api/ninja/devices/[deviceId]/patch-scan`
- POST `/api/ninja/devices/[deviceId]/patch-apply`
- POST `/api/ninja/devices/[deviceId]/script`
- POST `/api/ninja/devices/[deviceId]/services/[serviceId]/control`

## Server Actions (4)

- `linkTenantToNinjaOrg(tenantId, ninjaOrgId, ninjaOrgName)` — ADMIN
- `unlinkTenantFromNinjaOrg(tenantId)` — ADMIN
- `assignDeviceToUser(tenantId, ninjaDeviceId, ninjaDeviceName, adUserUpn, adUserName)` — EDITOR+
- `unassignDevice(assignmentId)` — EDITOR+

## RBAC

- **ADMIN:** Settings (linking), all actions
- **EDITOR:** Device actions (reboot, scripts, patches, services), assignments
- **VIEWER:** Read-only (view orgs, devices, detail)

## Audit Logging

Log to `audit_logs` table: tenant linking/unlinking, device reboot, script execution, patch operations, device assignments.

## Data Flow

```
Browser → API Route (auth) → ninja.ts (token cache) → NinjaOne API
                            ↘ prisma (DeviceAssignment, Tenant.ninjaOrgId)
```
