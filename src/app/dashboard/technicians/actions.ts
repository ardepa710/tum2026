"use server";

import { prisma } from "@/lib/prisma";
import { getGroups, getGroupMembers } from "@/lib/graph";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAudit, getActor } from "@/lib/audit";
import { requireRole } from "@/lib/rbac";
import { broadcastEvent } from "@/lib/sse";

export async function syncTechnicians() {
  await requireRole("ADMIN");
  const actor = await getActor();

  const rawTenantId = process.env.TECHNICIAN_SYNC_TENANT_ID;
  const SENTINEL_EDGE_TENANT_ID = rawTenantId ? Number(rawTenantId) : 10;
  const TUM_APP_GROUP_NAME =
    process.env.TECHNICIAN_SYNC_GROUP_NAME?.trim() || "TUM APP";

  if (!Number.isInteger(SENTINEL_EDGE_TENANT_ID) || SENTINEL_EDGE_TENANT_ID <= 0) {
    return {
      success: false,
      error: `TECHNICIAN_SYNC_TENANT_ID env var is invalid ("${rawTenantId}"). Must be a positive integer matching the DB tenant row ID.`,
    };
  }

  try {
    // 1. Fetch all groups and find the configured group name
    const groups = await getGroups(SENTINEL_EDGE_TENANT_ID);
    const tumGroup = groups.find(
      (g: { displayName?: string }) =>
        g.displayName?.toLowerCase() === TUM_APP_GROUP_NAME.toLowerCase()
    );

    if (!tumGroup) {
      return {
        success: false,
        error: `Group "${TUM_APP_GROUP_NAME}" not found in Sentinel Edge tenant.`,
      };
    }

    // 2. Fetch group members
    const members = await getGroupMembers(
      SENTINEL_EDGE_TENANT_ID,
      tumGroup.id
    );

    if (!members || members.length === 0) {
      return {
        success: false,
        error: "No members found in the TUM APP group.",
      };
    }

    // 3. Upsert each member
    const now = new Date();
    let syncedCount = 0;

    for (const member of members) {
      if (!member.id || !member.mail) continue;

      await prisma.technician.upsert({
        where: { msftId: member.id },
        update: {
          displayName: member.displayName || member.mail,
          email: member.mail.toLowerCase(),
          jobTitle: member.jobTitle || null,
          accountEnabled: member.accountEnabled ?? true,
          lastSyncAt: now,
        },
        create: {
          msftId: member.id,
          displayName: member.displayName || member.mail,
          email: member.mail.toLowerCase(),
          jobTitle: member.jobTitle || null,
          accountEnabled: member.accountEnabled ?? true,
          lastSyncAt: now,
        },
      });

      syncedCount++;
    }

    revalidatePath("/dashboard/technicians");

    logAudit({ actor, action: "SYNC", entity: "TECHNICIAN", details: { count: syncedCount, groupName: TUM_APP_GROUP_NAME } });
    broadcastEvent("tenant-update", { action: "tech-sync", count: syncedCount });
    return {
      success: true,
      message: `Synced ${syncedCount} technician(s) successfully.`,
    };
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Failed to sync technicians.";
    return { success: false, error: msg };
  }
}

export async function deleteTechnician(id: number) {
  await requireRole("ADMIN");
  const actor = await getActor();
  const tech = await prisma.technician.findUnique({ where: { id }, select: { displayName: true, email: true } });
  await prisma.technician.delete({ where: { id } });
  logAudit({ actor, action: "DELETE", entity: "TECHNICIAN", entityId: id, details: { displayName: tech?.displayName, email: tech?.email } });
  redirect("/dashboard/technicians");
}

// ─── Tenant Assignments ──────────────────────────────────────────────────────

export async function assignTenantToTechnician(
  _prevState: { error: string },
  formData: FormData
) {
  await requireRole("ADMIN");
  const actor = await getActor();

  const techEmail = (formData.get("techEmail") as string)?.trim().toLowerCase();
  const tenantId = Number(formData.get("tenantId"));

  if (!techEmail) return { error: "Technician email is required." };
  if (!tenantId || isNaN(tenantId)) return { error: "Tenant is required." };

  try {
    await prisma.techTenantAssignment.create({
      data: { techEmail, tenantId, assignedBy: actor },
    });
  } catch {
    return { error: "This technician already has access to that tenant." };
  }

  logAudit({ actor, action: "ASSIGN", entity: "TECH_TENANT", details: { techEmail, tenantId } });
  revalidatePath("/dashboard/technicians");
  return { error: "" };
}

export async function removeTenantFromTechnician(assignmentId: number, technicianId: number) {
  await requireRole("ADMIN");
  const actor = await getActor();

  const assignment = await prisma.techTenantAssignment.findUnique({
    where: { id: assignmentId },
    select: { techEmail: true, tenantId: true },
  });

  await prisma.techTenantAssignment.delete({ where: { id: assignmentId } });
  logAudit({ actor, action: "REMOVE", entity: "TECH_TENANT", entityId: assignmentId, details: { techEmail: assignment?.techEmail, tenantId: assignment?.tenantId } });
  revalidatePath(`/dashboard/technicians/${technicianId}`);
}
