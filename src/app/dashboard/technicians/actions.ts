"use server";

import { prisma } from "@/lib/prisma";
import { getGroups, getGroupMembers } from "@/lib/graph";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAudit, getActor } from "@/lib/audit";
import { requireRole } from "@/lib/rbac";
import { broadcastEvent } from "@/lib/sse";

const SENTINEL_EDGE_TENANT_ID = 10;
const TUM_APP_GROUP_NAME = "TUM APP";

export async function syncTechnicians() {
  await requireRole("ADMIN");
  const actor = await getActor();
  try {
    // 1. Fetch all groups and find "TUM APP"
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
    console.error("Technician sync error:", error);
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
