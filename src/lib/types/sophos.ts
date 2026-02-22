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
    services: {
      status: string;
      serviceDetails?: { name: string; status: string }[];
    };
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
