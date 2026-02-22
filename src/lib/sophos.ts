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
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const SOPHOS_CLIENT_ID = process.env.SOPHOS_CLIENT_ID!;
const SOPHOS_CLIENT_SECRET = process.env.SOPHOS_CLIENT_SECRET!;

// ---------------------------------------------------------------------------
// Token cache (global — Sophos uses partner-level token + partnerId)
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

  // Step 1: Get OAuth2 token
  const tokenUrl = "https://id.sophos.com/api/v2/oauth2/token";

  const body = new URLSearchParams({
    client_id: SOPHOS_CLIENT_ID,
    client_secret: SOPHOS_CLIENT_SECRET,
    scope: "token",
    grant_type: "client_credentials",
  });

  const tokenRes = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    const error = await tokenRes.text();
    throw new Error(`Sophos token request failed: ${error}`);
  }

  const tokenData = await tokenRes.json();
  const accessToken: string = tokenData.access_token;
  const expiresIn: number = tokenData.expires_in;

  // Step 2: Discover partner ID via whoami
  const whoamiRes = await fetch(
    "https://api.central.sophos.com/whoami/v1",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!whoamiRes.ok) {
    throw new Error(
      `Sophos whoami request failed: ${whoamiRes.status}`,
    );
  }

  const whoami: SophosWhoAmI = await whoamiRes.json();

  tokenCache = {
    token: accessToken,
    partnerId: whoami.id,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  return { token: accessToken, partnerId: whoami.id };
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function sophosGlobalFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const { token, partnerId } = await getAccessToken();

  const res = await fetch(`https://api.central.sophos.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Partner-ID": partnerId,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    throw new Error(`Sophos API error: ${path} returned ${res.status}`);
  }

  return res.json() as Promise<T>;
}

async function sophosTenantFetch<T>(
  tenantDbId: number,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantDbId },
    select: { sophosOrgId: true, sophosApiHost: true },
  });

  if (!tenant?.sophosOrgId || !tenant?.sophosApiHost) {
    throw new Error(
      `Tenant ${tenantDbId} has no Sophos configuration (missing sophosOrgId or sophosApiHost)`,
    );
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
    throw new Error(`Sophos API error: ${path} returned ${res.status}`);
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
    "/partner/v1/tenants?pageTotal=true",
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
    tamperProtectionEnabled?: boolean;
    isolationStatus?: string;
  },
): Promise<SophosEndpointListResponse> {
  const qs = new URLSearchParams();
  if (params?.pageSize !== undefined)
    qs.set("pageSize", String(params.pageSize));
  if (params?.page !== undefined) qs.set("page", String(params.page));
  if (params?.healthStatus) qs.set("healthStatus", params.healthStatus);
  if (params?.type) qs.set("type", params.type);
  if (params?.search) qs.set("search", params.search);
  if (params?.tamperProtectionEnabled !== undefined)
    qs.set(
      "tamperProtectionEnabled",
      String(params.tamperProtectionEnabled),
    );
  if (params?.isolationStatus)
    qs.set("isolationStatus", params.isolationStatus);
  const q = qs.toString();
  return sophosTenantFetch<SophosEndpointListResponse>(
    tenantDbId,
    `/endpoint/v1/endpoints${q ? `?${q}` : ""}`,
  );
}

export async function getSophosEndpoint(
  tenantDbId: number,
  endpointId: string,
): Promise<SophosEndpoint> {
  return sophosTenantFetch<SophosEndpoint>(
    tenantDbId,
    `/endpoint/v1/endpoints/${endpointId}`,
  );
}

export async function getSophosEndpointTamper(
  tenantDbId: number,
  endpointId: string,
): Promise<SophosTamperProtection> {
  return sophosTenantFetch<SophosTamperProtection>(
    tenantDbId,
    `/endpoint/v1/endpoints/${endpointId}/tamper-protection`,
  );
}

// ---------------------------------------------------------------------------
// Action functions
// ---------------------------------------------------------------------------

export async function setSophosEndpointTamper(
  tenantDbId: number,
  endpointId: string,
  enabled: boolean,
): Promise<SophosTamperProtection> {
  return sophosTenantFetch<SophosTamperProtection>(
    tenantDbId,
    `/endpoint/v1/endpoints/${endpointId}/tamper-protection`,
    {
      method: "POST",
      body: JSON.stringify({ enabled }),
    },
  );
}

export async function startSophosScan(
  tenantDbId: number,
  endpointId: string,
): Promise<void> {
  await sophosTenantFetch<void>(
    tenantDbId,
    `/endpoint/v1/endpoints/${endpointId}/scans`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

// ---------------------------------------------------------------------------
// Alert functions
// ---------------------------------------------------------------------------

export async function getSophosAlerts(
  tenantDbId: number,
  params?: {
    pageSize?: number;
    page?: number;
    severity?: string;
  },
): Promise<SophosAlertListResponse> {
  const qs = new URLSearchParams();
  if (params?.pageSize !== undefined)
    qs.set("pageSize", String(params.pageSize));
  if (params?.page !== undefined) qs.set("page", String(params.page));
  if (params?.severity) qs.set("severity", params.severity);
  const q = qs.toString();
  return sophosTenantFetch<SophosAlertListResponse>(
    tenantDbId,
    `/common/v1/alerts${q ? `?${q}` : ""}`,
  );
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export async function getSophosHealthCheck(
  tenantDbId: number,
): Promise<SophosHealthCheck> {
  return sophosTenantFetch<SophosHealthCheck>(
    tenantDbId,
    "/account-health-check/v1/health-check?checks=protection,policy,exclusions,tamperProtection",
  );
}

// ---------------------------------------------------------------------------
// Group functions
// ---------------------------------------------------------------------------

export async function getSophosEndpointGroups(
  tenantDbId: number,
): Promise<SophosEndpointGroupListResponse> {
  return sophosTenantFetch<SophosEndpointGroupListResponse>(
    tenantDbId,
    "/endpoint/v1/endpoint-groups",
  );
}

export async function getSophosGroupDetail(
  tenantDbId: number,
  groupId: string,
): Promise<SophosEndpointGroup> {
  return sophosTenantFetch<SophosEndpointGroup>(
    tenantDbId,
    `/endpoint/v1/endpoint-groups/${groupId}`,
  );
}

export async function getSophosGroupEndpoints(
  tenantDbId: number,
  groupId: string,
  params?: {
    pageSize?: number;
    page?: number;
  },
): Promise<SophosEndpointListResponse> {
  const qs = new URLSearchParams();
  if (params?.pageSize !== undefined)
    qs.set("pageSize", String(params.pageSize));
  if (params?.page !== undefined) qs.set("page", String(params.page));
  const q = qs.toString();
  return sophosTenantFetch<SophosEndpointListResponse>(
    tenantDbId,
    `/endpoint/v1/endpoint-groups/${groupId}/endpoints${q ? `?${q}` : ""}`,
  );
}

// ---------------------------------------------------------------------------
// Policies (read-only)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSophosPolicies(tenantDbId: number): Promise<any> {
  return sophosTenantFetch(tenantDbId, "/endpoint/v1/policies/settings");
}
