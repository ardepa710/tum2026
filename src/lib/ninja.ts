import type {
  NinjaOrganization,
  NinjaOrganizationDetailed,
  NinjaDevice,
  NinjaAlert,
  NinjaDisk,
  NinjaSoftware,
  NinjaOsPatch,
  NinjaNetworkInterface,
  NinjaProcessor,
  NinjaVolume,
  NinjaWindowsService,
  NinjaLastLoggedOnUser,
} from "@/lib/types/ninja";

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const NINJA_CLIENT_ID = process.env.NINJA_CLIENT_ID!;
const NINJA_CLIENT_SECRET = process.env.NINJA_CLIENT_SECRET!;
const NINJA_SCOPE = process.env.NINJA_SCOPE ?? "monitoring management";
const NINJA_BASE_URL =
  process.env.NINJA_BASE_URL ?? "https://app.ninjarmm.com";

// ---------------------------------------------------------------------------
// Token cache (single global — NinjaOne uses one token for everything)
// ---------------------------------------------------------------------------

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }

  const tokenUrl = `${NINJA_BASE_URL}/ws/oauth/token`;

  const body = new URLSearchParams({
    client_id: NINJA_CLIENT_ID,
    client_secret: NINJA_CLIENT_SECRET,
    scope: NINJA_SCOPE,
    grant_type: "client_credentials",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`NinjaOne token request failed: ${error}`);
  }

  const data = await res.json();

  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

async function ninjaFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();

  const res = await fetch(`${NINJA_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    throw new Error(`NinjaOne API error: ${path} returned ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Read functions
// ---------------------------------------------------------------------------

export async function getNinjaOrganizations(): Promise<NinjaOrganization[]> {
  return ninjaFetch<NinjaOrganization[]>("/v2/organizations");
}

export async function getNinjaOrgDetail(
  orgId: number,
): Promise<NinjaOrganizationDetailed> {
  return ninjaFetch<NinjaOrganizationDetailed>(`/v2/organization/${orgId}`);
}

export async function getNinjaOrgDevices(
  orgId: number,
  pageSize?: number,
  after?: number,
): Promise<NinjaDevice[]> {
  const params = new URLSearchParams();
  if (pageSize !== undefined) params.set("pageSize", String(pageSize));
  if (after !== undefined) params.set("after", String(after));
  const qs = params.toString();
  return ninjaFetch<NinjaDevice[]>(
    `/v2/organization/${orgId}/devices${qs ? `?${qs}` : ""}`,
  );
}

export async function getNinjaDevices(
  pageSize?: number,
  after?: number,
  filter?: string,
): Promise<NinjaDevice[]> {
  const params = new URLSearchParams();
  if (pageSize !== undefined) params.set("pageSize", String(pageSize));
  if (after !== undefined) params.set("after", String(after));
  if (filter) params.set("df", filter);
  const qs = params.toString();
  return ninjaFetch<NinjaDevice[]>(
    `/v2/devices-detailed${qs ? `?${qs}` : ""}`,
  );
}

export async function getNinjaDeviceDetail(
  deviceId: number,
): Promise<NinjaDevice> {
  return ninjaFetch<NinjaDevice>(`/v2/device/${deviceId}`);
}

export async function getNinjaDeviceAlerts(
  deviceId: number,
): Promise<NinjaAlert[]> {
  return ninjaFetch<NinjaAlert[]>(`/v2/device/${deviceId}/alerts`);
}

export async function getNinjaDeviceDisks(
  deviceId: number,
): Promise<NinjaDisk[]> {
  return ninjaFetch<NinjaDisk[]>(`/v2/device/${deviceId}/disks`);
}

export async function getNinjaDeviceSoftware(
  deviceId: number,
): Promise<NinjaSoftware[]> {
  return ninjaFetch<NinjaSoftware[]>(`/v2/device/${deviceId}/software`);
}

export async function getNinjaDeviceOsPatches(
  deviceId: number,
): Promise<NinjaOsPatch[]> {
  return ninjaFetch<NinjaOsPatch[]>(`/v2/device/${deviceId}/os-patches`);
}

export async function getNinjaDeviceSoftwarePatches(
  deviceId: number,
): Promise<NinjaOsPatch[]> {
  return ninjaFetch<NinjaOsPatch[]>(`/v2/device/${deviceId}/software-patches`);
}

export async function getNinjaDeviceNetInterfaces(
  deviceId: number,
): Promise<NinjaNetworkInterface[]> {
  return ninjaFetch<NinjaNetworkInterface[]>(
    `/v2/device/${deviceId}/network-interfaces`,
  );
}

export async function getNinjaDeviceProcessors(
  deviceId: number,
): Promise<NinjaProcessor[]> {
  return ninjaFetch<NinjaProcessor[]>(`/v2/device/${deviceId}/processors`);
}

export async function getNinjaDeviceVolumes(
  deviceId: number,
): Promise<NinjaVolume[]> {
  return ninjaFetch<NinjaVolume[]>(`/v2/device/${deviceId}/volumes`);
}

export async function getNinjaDeviceWindowsServices(
  deviceId: number,
): Promise<NinjaWindowsService[]> {
  return ninjaFetch<NinjaWindowsService[]>(
    `/v2/device/${deviceId}/windows-services`,
  );
}

export async function getNinjaDeviceLastUser(
  deviceId: number,
): Promise<NinjaLastLoggedOnUser | null> {
  try {
    return await ninjaFetch<NinjaLastLoggedOnUser>(
      `/v2/device/${deviceId}/last-logged-on-user`,
    );
  } catch {
    return null;
  }
}

export async function getNinjaAlerts(): Promise<NinjaAlert[]> {
  return ninjaFetch<NinjaAlert[]>("/v2/alerts");
}

// ---------------------------------------------------------------------------
// Action functions
// ---------------------------------------------------------------------------

export async function rebootDevice(
  deviceId: number,
  mode: "NORMAL" | "FORCED",
  reason?: string,
): Promise<void> {
  await ninjaFetch<void>(`/v2/device/${deviceId}/reboot/${mode}`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function runDeviceScript(
  deviceId: number,
  scriptId: number,
  parameters?: Record<string, string>,
): Promise<void> {
  await ninjaFetch<void>(`/v2/device/${deviceId}/script/run`, {
    method: "POST",
    body: JSON.stringify({ type: "SCRIPT", id: scriptId, parameters }),
  });
}

export async function setDeviceMaintenance(
  deviceId: number,
  endTime: number,
  reason?: string,
  disabledFeatures: string[] = ["ALERTS", "PATCHING"],
): Promise<void> {
  await ninjaFetch<void>(`/v2/device/${deviceId}/maintenance`, {
    method: "PUT",
    body: JSON.stringify({
      disabledFeatures,
      end: endTime,
      reasonMessage: reason,
    }),
  });
}

export async function cancelDeviceMaintenance(
  deviceId: number,
): Promise<void> {
  await ninjaFetch<void>(`/v2/device/${deviceId}/maintenance`, {
    method: "DELETE",
  });
}

export async function scanOsPatches(deviceId: number): Promise<void> {
  await ninjaFetch<void>(`/v2/device/${deviceId}/patch/os/scan`, {
    method: "POST",
  });
}

export async function applyOsPatches(deviceId: number): Promise<void> {
  await ninjaFetch<void>(`/v2/device/${deviceId}/patch/os/apply`, {
    method: "POST",
  });
}

export async function scanSoftwarePatches(deviceId: number): Promise<void> {
  await ninjaFetch<void>(`/v2/device/${deviceId}/patch/software/scan`, {
    method: "POST",
  });
}

export async function applySoftwarePatches(deviceId: number): Promise<void> {
  await ninjaFetch<void>(`/v2/device/${deviceId}/patch/software/apply`, {
    method: "POST",
  });
}

export async function controlWindowsService(
  deviceId: number,
  serviceId: string,
  action: "START" | "PAUSE" | "STOP" | "RESTART",
): Promise<void> {
  await ninjaFetch<void>(
    `/v2/device/${deviceId}/windows-service/${serviceId}/control`,
    {
      method: "POST",
      body: JSON.stringify({ action }),
    },
  );
}
