"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit, getActor } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function linkTenantToNinjaOrg(
  _prevState: { error: string },
  formData: FormData
) {
  await requireRole("ADMIN");
  const actor = await getActor();

  const tenantIdRaw = formData.get("tenantId") as string;
  const ninjaOrgIdRaw = formData.get("ninjaOrgId") as string;
  const ninjaOrgName = (formData.get("ninjaOrgName") as string)?.trim();

  const tenantId = Number(tenantIdRaw);
  const ninjaOrgId = Number(ninjaOrgIdRaw);

  if (!tenantIdRaw || isNaN(tenantId)) {
    return { error: "Invalid tenant ID." };
  }
  if (!ninjaOrgIdRaw || isNaN(ninjaOrgId)) {
    return { error: "Please select a NinjaOne organization." };
  }
  if (!ninjaOrgName) {
    return { error: "NinjaOne organization name is required." };
  }

  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { ninjaOrgId, ninjaOrgName },
    });
  } catch {
    return { error: "Failed to link tenant. Please try again." };
  }

  logAudit({
    actor,
    action: "LINK",
    entity: "TENANT_NINJA_ORG",
    entityId: tenantId,
    details: { tenantId, ninjaOrgId, ninjaOrgName },
  });

  revalidatePath("/dashboard/rmm/settings");
  return { error: "" };
}

export async function unlinkTenantFromNinjaOrg(
  _prevState: { error: string },
  formData: FormData
) {
  await requireRole("ADMIN");
  const actor = await getActor();

  const tenantIdRaw = formData.get("tenantId") as string;
  const tenantId = Number(tenantIdRaw);

  if (!tenantIdRaw || isNaN(tenantId)) {
    return { error: "Invalid tenant ID." };
  }

  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { ninjaOrgId: null, ninjaOrgName: null },
    });
  } catch {
    return { error: "Failed to unlink tenant. Please try again." };
  }

  logAudit({
    actor,
    action: "UNLINK",
    entity: "TENANT_NINJA_ORG",
    entityId: tenantId,
    details: { tenantId },
  });

  revalidatePath("/dashboard/rmm/settings");
  return { error: "" };
}
