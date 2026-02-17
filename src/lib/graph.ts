import { Client } from "@microsoft/microsoft-graph-client";
import { prisma } from "@/lib/prisma";

async function getGraphClient(tenantId: number): Promise<Client | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant?.tenantIdMsft) {
    return null;
  }

  // For now, Graph API requires Azure App Registration credentials per tenant.
  // These will be added as separate config when needed.
  // Using tenantIdMsft for the token endpoint.
  return null;
}

export async function getUsers(tenantId: number) {
  const client = await getGraphClient(tenantId);
  if (!client) return [];

  const response = await client
    .api("/users")
    .select("id,displayName,mail,userPrincipalName,accountEnabled,jobTitle,department")
    .top(100)
    .get();

  return response.value;
}

export async function getGroups(tenantId: number) {
  const client = await getGraphClient(tenantId);
  if (!client) return [];

  const response = await client
    .api("/groups")
    .select("id,displayName,description,mail,groupTypes,membershipRule")
    .top(100)
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
