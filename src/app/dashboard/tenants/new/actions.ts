"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function createTenant(
  _prevState: { error: string },
  formData: FormData
) {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: "You must be logged in to create a tenant." };
  }

  const tenantName = (formData.get("tenantName") as string)?.trim();
  const tenantAbbrv = (formData.get("tenantAbbrv") as string)?.trim();
  const tenantIdRewst = (formData.get("tenantIdRewst") as string)?.trim();
  const tenantIdMsft = (formData.get("tenantIdMsft") as string)?.trim();

  if (!tenantName) return { error: "Tenant Name is required." };
  if (!tenantAbbrv) return { error: "Tenant Abbreviation is required." };
  if (!tenantIdRewst) return { error: "Rewst Tenant ID is required." };
  if (!tenantIdMsft) return { error: "Microsoft Tenant ID is required." };

  try {
    await prisma.tenant.create({
      data: {
        tenantName,
        tenantAbbrv,
        tenantIdRewst,
        tenantIdMsft,
        regUser: session.user.email,
      },
    });
  } catch {
    return { error: "Failed to create tenant. Please try again." };
  }

  redirect("/dashboard/tenants");
}

export async function updateTenant(
  _prevState: { error: string },
  formData: FormData
) {
  const id = Number(formData.get("id"));
  const tenantName = (formData.get("tenantName") as string)?.trim();
  const tenantAbbrv = (formData.get("tenantAbbrv") as string)?.trim();
  const tenantIdRewst = (formData.get("tenantIdRewst") as string)?.trim();
  const tenantIdMsft = (formData.get("tenantIdMsft") as string)?.trim();

  if (!tenantName) return { error: "Tenant Name is required." };
  if (!tenantAbbrv) return { error: "Tenant Abbreviation is required." };
  if (!tenantIdRewst) return { error: "Rewst Tenant ID is required." };
  if (!tenantIdMsft) return { error: "Microsoft Tenant ID is required." };

  try {
    await prisma.tenant.update({
      where: { id },
      data: { tenantName, tenantAbbrv, tenantIdRewst, tenantIdMsft },
    });
  } catch {
    return { error: "Failed to update tenant. Please try again." };
  }

  redirect(`/dashboard/tenants/${id}`);
}

export async function deleteTenant(id: number) {
  await prisma.tenant.delete({ where: { id } });
  redirect("/dashboard/tenants");
}
