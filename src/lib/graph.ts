import { Client } from "@microsoft/microsoft-graph-client";
import { prisma } from "@/lib/prisma";

async function getGraphClient(tenantId: string): Promise<Client | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant?.azureTenantId || !tenant?.azureClientId || !tenant?.azureClientSecret) {
    return null;
  }

  // Get access token using client credentials flow
  const tokenUrl = `https://login.microsoftonline.com/${tenant.azureTenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    client_id: tenant.azureClientId,
    client_secret: tenant.azureClientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!tokenResponse.ok) {
    throw new Error(`Failed to get token: ${tokenResponse.statusText}`);
  }

  const tokenData = await tokenResponse.json();

  return Client.init({
    authProvider: (done) => {
      done(null, tokenData.access_token);
    },
  });
}

export async function getUsers(tenantId: string) {
  const client = await getGraphClient(tenantId);
  if (!client) return [];

  const response = await client
    .api("/users")
    .select("id,displayName,mail,userPrincipalName,accountEnabled,jobTitle,department")
    .top(100)
    .get();

  return response.value;
}

export async function getGroups(tenantId: string) {
  const client = await getGraphClient(tenantId);
  if (!client) return [];

  const response = await client
    .api("/groups")
    .select("id,displayName,description,mail,groupTypes,membershipRule")
    .top(100)
    .get();

  return response.value;
}

export async function getLicenses(tenantId: string) {
  const client = await getGraphClient(tenantId);
  if (!client) return [];

  const response = await client
    .api("/subscribedSkus")
    .get();

  return response.value;
}
