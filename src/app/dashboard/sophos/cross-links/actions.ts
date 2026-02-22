"use server";

import { prisma } from "@/lib/prisma";
import { getSessionRole, hasMinRole } from "@/lib/rbac";
import { getActor, logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Create a single cross-link
// ---------------------------------------------------------------------------

export async function createCrossLink(
  tenantId: number,
  ninjaDeviceId: number,
  ninjaDeviceName: string,
  sophosEndpointId: string,
  sophosEndpointName: string,
): Promise<
  | { success: true; crossLink: { id: number; tenantId: number; ninjaDeviceId: number; ninjaDeviceName: string; sophosEndpointId: string; sophosEndpointName: string; linkedAt: Date; linkedBy: string } }
  | { success: false; error: string }
> {
  try {
    const role = await getSessionRole();
    if (!hasMinRole(role, "EDITOR")) {
      return { success: false, error: "Insufficient permissions" };
    }

    const actor = await getActor();

    const crossLink = await prisma.deviceCrossLink.create({
      data: {
        tenantId,
        ninjaDeviceId,
        ninjaDeviceName,
        sophosEndpointId,
        sophosEndpointName,
        linkedBy: actor,
      },
    });

    logAudit({
      actor,
      action: "CROSS_LINK_CREATE",
      entity: "DeviceCrossLink",
      entityId: crossLink.id,
      details: {
        tenantId,
        ninjaDeviceId,
        ninjaDeviceName,
        sophosEndpointId,
        sophosEndpointName,
      },
    });

    revalidatePath("/dashboard/sophos/settings");
    revalidatePath("/dashboard/rmm/devices");

    return { success: true, crossLink };
  } catch (err) {
    // Check for unique constraint violation (Prisma P2002)
    if (
      err instanceof Error &&
      "code" in err &&
      (err as unknown as { code: string }).code === "P2002"
    ) {
      return {
        success: false,
        error: "A cross-link already exists for this device or endpoint in this tenant",
      };
    }
    const message = err instanceof Error ? err.message : "Failed to create cross-link";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Delete a cross-link
// ---------------------------------------------------------------------------

export async function deleteCrossLink(
  crossLinkId: number,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const role = await getSessionRole();
    if (!hasMinRole(role, "EDITOR")) {
      return { success: false, error: "Insufficient permissions" };
    }

    const actor = await getActor();

    // Fetch the cross-link first to include details in the audit log
    const existing = await prisma.deviceCrossLink.findUnique({
      where: { id: crossLinkId },
    });

    if (!existing) {
      return { success: false, error: "Cross-link not found" };
    }

    await prisma.deviceCrossLink.delete({ where: { id: crossLinkId } });

    logAudit({
      actor,
      action: "CROSS_LINK_DELETE",
      entity: "DeviceCrossLink",
      entityId: crossLinkId,
      details: {
        tenantId: existing.tenantId,
        ninjaDeviceId: existing.ninjaDeviceId,
        ninjaDeviceName: existing.ninjaDeviceName,
        sophosEndpointId: existing.sophosEndpointId,
        sophosEndpointName: existing.sophosEndpointName,
      },
    });

    revalidatePath("/dashboard/sophos/settings");
    revalidatePath("/dashboard/rmm/devices");

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete cross-link";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Bulk create cross-links (auto-match results)
// ---------------------------------------------------------------------------

export async function bulkCreateCrossLinks(
  tenantId: number,
  matches: Array<{
    ninjaDeviceId: number;
    ninjaDeviceName: string;
    sophosEndpointId: string;
    sophosEndpointName: string;
  }>,
): Promise<{ success: true; count: number } | { success: false; error: string }> {
  try {
    const role = await getSessionRole();
    if (!hasMinRole(role, "ADMIN")) {
      return { success: false, error: "Insufficient permissions — ADMIN role required" };
    }

    if (!matches.length) {
      return { success: false, error: "No matches provided" };
    }

    const actor = await getActor();

    const created = await prisma.$transaction(
      matches.map((match) =>
        prisma.deviceCrossLink.create({
          data: {
            tenantId,
            ninjaDeviceId: match.ninjaDeviceId,
            ninjaDeviceName: match.ninjaDeviceName,
            sophosEndpointId: match.sophosEndpointId,
            sophosEndpointName: match.sophosEndpointName,
            linkedBy: actor,
          },
        }),
      ),
    );

    // Log audit for each created cross-link
    for (const crossLink of created) {
      logAudit({
        actor,
        action: "CROSS_LINK_CREATE",
        entity: "DeviceCrossLink",
        entityId: crossLink.id,
        details: {
          tenantId,
          ninjaDeviceId: crossLink.ninjaDeviceId,
          ninjaDeviceName: crossLink.ninjaDeviceName,
          sophosEndpointId: crossLink.sophosEndpointId,
          sophosEndpointName: crossLink.sophosEndpointName,
          bulkOperation: true,
        },
      });
    }

    revalidatePath("/dashboard/sophos/settings");
    revalidatePath("/dashboard/rmm/devices");

    return { success: true, count: created.length };
  } catch (err) {
    // Check for unique constraint violation (Prisma P2002)
    if (
      err instanceof Error &&
      "code" in err &&
      (err as unknown as { code: string }).code === "P2002"
    ) {
      return {
        success: false,
        error: "One or more cross-links already exist — some devices or endpoints are already linked",
      };
    }
    const message = err instanceof Error ? err.message : "Failed to bulk create cross-links";
    return { success: false, error: message };
  }
}
