"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { logAudit, getActor } from "@/lib/audit";
import { requireRole } from "@/lib/rbac";
import { broadcastEvent } from "@/lib/sse";

export async function createTenant(
  _prevState: { error: string },
  formData: FormData
) {
  await requireRole("EDITOR");
  const session = await auth();
  if (!session?.user?.email) {
    return { error: "You must be logged in to create a tenant." };
  }

  const tenantName = (formData.get("tenantName") as string)?.trim();
  const tenantAbbrv = (formData.get("tenantAbbrv") as string)?.trim();
  const tenantIdRewst = (formData.get("tenantIdRewst") as string)?.trim();
  const tenantIdMsft = (formData.get("tenantIdMsft") as string)?.trim();
  const domainUrl = (formData.get("domainUrl") as string)?.trim() || null;

  if (!tenantName) return { error: "Tenant Name is required." };
  if (!tenantAbbrv) return { error: "Tenant Abbreviation is required." };
  if (!tenantIdRewst) return { error: "Rewst Tenant ID is required." };
  if (!tenantIdMsft) return { error: "Microsoft Tenant ID is required." };

  let newTenant;
  try {
    newTenant = await prisma.tenant.create({
      data: {
        tenantName,
        tenantAbbrv,
        tenantIdRewst,
        tenantIdMsft,
        domainUrl,
        regUser: session.user.email,
      },
    });
  } catch {
    return { error: "Failed to create tenant. Please try again." };
  }

  logAudit({ actor: session.user.email, action: "CREATE", entity: "TENANT", entityId: newTenant.id, details: { tenantName, tenantAbbrv } });
  broadcastEvent("tenant-update", { action: "create", tenantId: newTenant.id, tenantName });
  redirect("/dashboard/tenants");
}

export async function updateTenant(
  _prevState: { error: string },
  formData: FormData
) {
  await requireRole("EDITOR");
  const actor = await getActor();
  const id = Number(formData.get("id"));
  const tenantName = (formData.get("tenantName") as string)?.trim();
  const tenantAbbrv = (formData.get("tenantAbbrv") as string)?.trim();
  const tenantIdRewst = (formData.get("tenantIdRewst") as string)?.trim();
  const tenantIdMsft = (formData.get("tenantIdMsft") as string)?.trim();
  const domainUrl = (formData.get("domainUrl") as string)?.trim() || null;

  if (!tenantName) return { error: "Tenant Name is required." };
  if (!tenantAbbrv) return { error: "Tenant Abbreviation is required." };
  if (!tenantIdRewst) return { error: "Rewst Tenant ID is required." };
  if (!tenantIdMsft) return { error: "Microsoft Tenant ID is required." };

  try {
    await prisma.tenant.update({
      where: { id },
      data: { tenantName, tenantAbbrv, tenantIdRewst, tenantIdMsft, domainUrl },
    });
  } catch {
    return { error: "Failed to update tenant. Please try again." };
  }

  logAudit({ actor, action: "UPDATE", entity: "TENANT", entityId: id, details: { tenantName, tenantAbbrv } });
  redirect(`/dashboard/tenants/${id}`);
}

export async function deleteTenant(id: number) {
  await requireRole("EDITOR");
  const actor = await getActor();
  const tenant = await prisma.tenant.findUnique({ where: { id }, select: { tenantName: true } });
  await prisma.tenant.delete({ where: { id } });
  logAudit({ actor, action: "DELETE", entity: "TENANT", entityId: id, details: { tenantName: tenant?.tenantName } });
  broadcastEvent("tenant-update", { action: "delete", tenantId: id });
  redirect("/dashboard/tenants");
}
