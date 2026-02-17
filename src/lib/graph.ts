import { Client } from "@microsoft/microsoft-graph-client";
import { prisma } from "@/lib/prisma";

const GRAPH_CLIENT_ID = process.env.GRAPH_CLIENT_ID!;
const GRAPH_CLIENT_SECRET = process.env.GRAPH_CLIENT_SECRET!;

// Cache tokens per tenant to avoid re-authenticating on every request
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function getAccessToken(msftTenantId: string): Promise<string> {
  const cached = tokenCache.get(msftTenantId);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  const tokenUrl = `https://login.microsoftonline.com/${msftTenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: GRAPH_CLIENT_ID,
    client_secret: GRAPH_CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to get token for tenant ${msftTenantId}: ${error}`);
  }

  const data = await res.json();

  tokenCache.set(msftTenantId, {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  });

  return data.access_token;
}

async function getGraphClient(tenantId: number): Promise<Client | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant?.tenantIdMsft) {
    return null;
  }

  const accessToken = await getAccessToken(tenant.tenantIdMsft);

  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
}

export async function getUsers(tenantId: number) {
  const client = await getGraphClient(tenantId);
  if (!client) return [];

  const response = await client
    .api("/users")
    .select("id,displayName,mail,userPrincipalName,accountEnabled,jobTitle,department")
    .top(999)
    .get();

  return response.value;
}

export async function getGroups(tenantId: number) {
  const client = await getGraphClient(tenantId);
  if (!client) return [];

  const response = await client
    .api("/groups")
    .select("id,displayName,description,mail,groupTypes,membershipRule")
    .top(999)
    .get();

  return response.value;
}

export async function getLicenses(tenantId: number) {
  const client = await getGraphClient(tenantId);
  if (!client) return [];

  const response = await client
    .api("/subscribedSkus")
    .get();

  return response.value;
}
