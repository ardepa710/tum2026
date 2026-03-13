"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { logAudit, getActor } from "@/lib/audit";
import { requireRole } from "@/lib/rbac";

function validateAdditionalDataSchema(raw: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return "Webhook Data must be valid JSON.";
  }
  if (!Array.isArray(parsed)) {
    return "Webhook Data must be a JSON array, e.g. [{\"name\":\"field1\",\"label\":\"Field 1\",\"type\":\"text\"}].";
  }
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) {
      return "Each item in Webhook Data must be an object.";
    }
    const { name, label, type } = item as Record<string, unknown>;
    if (!name || typeof name !== "string") {
      return `Each item must have a "name" string field (key used in additional_data).`;
    }
    if (!label || typeof label !== "string") {
      return `Each item must have a "label" string field (display label in the form).`;
    }
    if (!type || typeof type !== "string") {
      return `Each item must have a "type" field: "text", "textarea", "select", "number", or "checkbox".`;
    }
  }
  return null;
}

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
  const additionalDataSchemaRaw = (formData.get("additionalDataSchema") as string)?.trim() || null;

  if (!taskName) return { error: "Task Name is required." };
  if (!taskCode) return { error: "Task Code is required." };

  if (additionalDataSchemaRaw) {
    const schemaError = validateAdditionalDataSchema(additionalDataSchemaRaw);
    if (schemaError) return { error: schemaError };
  }
  const additionalDataSchema = additionalDataSchemaRaw;

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
        additionalDataSchema,
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
  const additionalDataSchemaRaw = (formData.get("additionalDataSchema") as string)?.trim() || null;

  if (!taskName) return { error: "Task Name is required." };
  if (!taskCode) return { error: "Task Code is required." };

  if (additionalDataSchemaRaw) {
    const schemaError = validateAdditionalDataSchema(additionalDataSchemaRaw);
    if (schemaError) return { error: schemaError };
  }
  const additionalDataSchema = additionalDataSchemaRaw;

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
        additionalDataSchema,
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
