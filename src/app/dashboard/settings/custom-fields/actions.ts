"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit, getActor } from "@/lib/audit";
import { redirect } from "next/navigation";

export async function createCustomField(
  _prevState: { error: string },
  formData: FormData
) {
  await requireRole("ADMIN");
  const actor = await getActor();

  const entityType = (formData.get("entityType") as string)?.trim();
  const fieldName = (formData.get("fieldName") as string)?.trim();
  const fieldType = (formData.get("fieldType") as string)?.trim();
  const options = (formData.get("options") as string)?.trim() || null;
  const isRequired = formData.get("isRequired") === "true";

  if (!entityType || !fieldName || !fieldType) {
    return { error: "Entity type, field name, and field type are required." };
  }
  if (!["tenant", "task"].includes(entityType)) {
    return { error: "Entity type must be 'tenant' or 'task'." };
  }
  if (!["text", "number", "date", "select"].includes(fieldType)) {
    return { error: "Invalid field type." };
  }
  if (fieldType === "select" && !options) {
    return { error: "Select fields require options (comma-separated)." };
  }

  const maxSort = await prisma.customField.aggregate({
    where: { entityType },
    _max: { sortOrder: true },
  });

  const field = await prisma.customField.create({
    data: {
      entityType,
      fieldName,
      fieldType,
      options,
      isRequired,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      createdBy: actor,
    },
  });

  logAudit({
    actor,
    action: "CREATE",
    entity: "CUSTOM_FIELD",
    entityId: field.id,
    details: { fieldName, entityType, fieldType },
  });
  redirect("/dashboard/settings/custom-fields");
}

export async function deleteCustomField(id: number) {
  await requireRole("ADMIN");
  const actor = await getActor();
  await prisma.customField.delete({ where: { id } });
  logAudit({
    actor,
    action: "DELETE",
    entity: "CUSTOM_FIELD",
    entityId: id,
  });
  redirect("/dashboard/settings/custom-fields");
}
