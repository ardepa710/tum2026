"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit, getActor } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function linkTenantToSophos(
  _prevState: { error: string },
  formData: FormData
) {
  await requireRole("ADMIN");
  const actor = await getActor();

  const tenantIdRaw = formData.get("tenantId") as string;
  const sophosOrgId = (formData.get("sophosOrgId") as string)?.trim();
  const sophosRegion = (formData.get("sophosRegion") as string)?.trim();
  const sophosApiHost = (formData.get("sophosApiHost") as string)?.trim();

  const tenantId = Number(tenantIdRaw);

  if (!tenantIdRaw || isNaN(tenantId)) {
    return { error: "Invalid tenant ID." };
  }
  if (!sophosOrgId) {
    return { error: "Please select a Sophos tenant." };
  }

  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { sophosOrgId, sophosRegion, sophosApiHost },
    });
  } catch {
    return { error: "Failed to link tenant. Please try again." };
  }

  logAudit({
    actor,
    action: "LINK",
    entity: "TENANT_SOPHOS",
    entityId: tenantId,
    details: { tenantId, sophosOrgId, sophosRegion },
  });

  revalidatePath("/dashboard/sophos/settings");
  return { error: "" };
}

export async function unlinkTenantFromSophos(
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
      data: { sophosOrgId: null, sophosRegion: null, sophosApiHost: null },
    });
  } catch {
    return { error: "Failed to unlink tenant. Please try again." };
  }

  logAudit({
    actor,
    action: "UNLINK",
    entity: "TENANT_SOPHOS",
    entityId: tenantId,
    details: { tenantId },
  });

  revalidatePath("/dashboard/sophos/settings");
  return { error: "" };
}
