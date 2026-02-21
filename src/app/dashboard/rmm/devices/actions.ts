"use server";

import { prisma } from "@/lib/prisma";
import { getSessionRole, hasMinRole } from "@/lib/rbac";
import { getActor, logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function assignDeviceToUser(
  tenantId: number,
  ninjaDeviceId: number,
  ninjaDeviceName: string,
  adUserUpn: string,
  adUserName: string,
): Promise<
  | { success: true; assignment: { id: number; adUserUpn: string; adUserName: string; assignedAt: Date; assignedBy: string } }
  | { success: false; error: string }
> {
  try {
    const role = await getSessionRole();
    if (!hasMinRole(role, "EDITOR")) {
      return { success: false, error: "Insufficient permissions" };
    }
    const actor = await getActor();

    const result = await prisma.deviceAssignment.upsert({
      where: { tenantId_ninjaDeviceId: { tenantId, ninjaDeviceId } },
      create: {
        tenantId,
        ninjaDeviceId,
        ninjaDeviceName,
        adUserUpn,
        adUserName,
        assignedBy: actor,
      },
      update: {
        adUserUpn,
        adUserName,
        assignedBy: actor,
        assignedAt: new Date(),
      },
    });

    logAudit({
      actor,
      action: "DEVICE_ASSIGN",
      entity: "DeviceAssignment",
      entityId: result.id,
      details: { tenantId, ninjaDeviceId, ninjaDeviceName, adUserUpn, adUserName },
    });

    revalidatePath(`/dashboard/rmm/devices/${ninjaDeviceId}`);

    return { success: true, assignment: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to assign device";
    return { success: false, error: message };
  }
}

export async function unassignDevice(
  assignmentId: number,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const role = await getSessionRole();
    if (!hasMinRole(role, "EDITOR")) {
      return { success: false, error: "Insufficient permissions" };
    }
    const actor = await getActor();

    const assignment = await prisma.deviceAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      return { success: false, error: "Assignment not found" };
    }

    await prisma.deviceAssignment.delete({
      where: { id: assignmentId },
    });

    logAudit({
      actor,
      action: "DEVICE_UNASSIGN",
      entity: "DeviceAssignment",
      entityId: assignmentId,
      details: {
        ninjaDeviceId: assignment.ninjaDeviceId,
        ninjaDeviceName: assignment.ninjaDeviceName,
        adUserUpn: assignment.adUserUpn,
        adUserName: assignment.adUserName,
      },
    });

    revalidatePath(`/dashboard/rmm/devices/${assignment.ninjaDeviceId}`);

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to unassign device";
    return { success: false, error: message };
  }
}
