"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { logAudit, getActor } from "@/lib/audit";
import { requireRole } from "@/lib/rbac";

export async function createMasterTask(
  _prevState: { error: string },
  formData: FormData
) {
  await requireRole("EDITOR");
  const actor = await getActor();
  const taskName = (formData.get("taskName") as string)?.trim();
  const taskCode = (formData.get("taskCode") as string)?.trim();
  const taskDetails = (formData.get("taskDetails") as string)?.trim() || null;
  const ticketRequired = formData.get("ticketRequired") === "on";
  const usernameRequired = formData.get("usernameRequired") === "on";
  const syncRequired = formData.get("syncRequired") === "on";
  const rewstWebhook =
    (formData.get("rewstWebhook") as string)?.trim() || null;
  const tenantExclusive =
    (formData.get("tenantExclusive") as string)?.trim() || null;
  const taskGroup = (formData.get("taskGroup") as string)?.trim() || null;
  const systemMgr = (formData.get("systemMgr") as string)?.trim() || null;

  if (!taskName) return { error: "Task Name is required." };
  if (!taskCode) return { error: "Task Code is required." };

  let newTask;
  try {
    newTask = await prisma.masterTask.create({
      data: {
        taskName,
        taskCode,
        taskDetails,
        ticketRequired,
        usernameRequired,
        syncRequired,
        rewstWebhook,
        tenantExclusive,
        taskGroup,
        systemMgr,
      },
    });
  } catch {
    return { error: "Failed to create task. Please try again." };
  }

  logAudit({ actor, action: "CREATE", entity: "TASK", entityId: newTask.id, details: { taskName, taskCode } });
  redirect("/dashboard/tasks");
}

export async function updateMasterTask(
  _prevState: { error: string },
  formData: FormData
) {
  await requireRole("EDITOR");
  const actor = await getActor();
  const id = Number(formData.get("id"));
  const taskName = (formData.get("taskName") as string)?.trim();
  const taskCode = (formData.get("taskCode") as string)?.trim();
  const taskDetails = (formData.get("taskDetails") as string)?.trim() || null;
  const ticketRequired = formData.get("ticketRequired") === "on";
  const usernameRequired = formData.get("usernameRequired") === "on";
  const syncRequired = formData.get("syncRequired") === "on";
  const rewstWebhook =
    (formData.get("rewstWebhook") as string)?.trim() || null;
  const tenantExclusive =
    (formData.get("tenantExclusive") as string)?.trim() || null;
  const taskGroup = (formData.get("taskGroup") as string)?.trim() || null;
  const systemMgr = (formData.get("systemMgr") as string)?.trim() || null;

  if (!taskName) return { error: "Task Name is required." };
  if (!taskCode) return { error: "Task Code is required." };

  try {
    await prisma.masterTask.update({
      where: { id },
      data: {
        taskName,
        taskCode,
        taskDetails,
        ticketRequired,
        usernameRequired,
        syncRequired,
        rewstWebhook,
        tenantExclusive,
        taskGroup,
        systemMgr,
      },
    });
  } catch {
    return { error: "Failed to update task. Please try again." };
  }

  logAudit({ actor, action: "UPDATE", entity: "TASK", entityId: id, details: { taskName, taskCode } });
  redirect(`/dashboard/tasks/${id}`);
}

export async function deleteMasterTask(id: number) {
  await requireRole("EDITOR");
  const actor = await getActor();
  const task = await prisma.masterTask.findUnique({ where: { id }, select: { taskName: true } });
  await prisma.masterTask.delete({ where: { id } });
  logAudit({ actor, action: "DELETE", entity: "TASK", entityId: id, details: { taskName: task?.taskName } });
  redirect("/dashboard/tasks");
}
