"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function createTenant(
  _prevState: { error: string | null },
  formData: FormData
) {
  const name = formData.get("name") as string;
  const domain = (formData.get("domain") as string) || null;
  const azureTenantId = (formData.get("azureTenantId") as string) || null;
  const azureClientId = (formData.get("azureClientId") as string) || null;
  const azureClientSecret =
    (formData.get("azureClientSecret") as string) || null;

  if (!name || name.trim().length === 0) {
    return { error: "Tenant name is required." };
  }

  try {
    await prisma.tenant.create({
      data: {
        name: name.trim(),
        domain: domain?.trim() || null,
        azureTenantId: azureTenantId?.trim() || null,
        azureClientId: azureClientId?.trim() || null,
        azureClientSecret: azureClientSecret?.trim() || null,
      },
    });
  } catch {
    return { error: "Failed to create tenant. Please try again." };
  }

  redirect("/dashboard/tenants");
}
