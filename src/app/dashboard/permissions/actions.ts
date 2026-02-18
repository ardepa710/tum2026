"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logAudit, getActor } from "@/lib/audit";
import { requireRole } from "@/lib/rbac";

// ─── CRUD ────────────────────────────────────────

export async function createPermission(
  _prevState: { error: string },
  formData: FormData
) {
  await requireRole("ADMIN");
  const session = await auth();
  if (!session?.user?.email) {
    return { error: "You must be logged in." };
  }

  const permissionCode = (formData.get("permissionCode") as string)
    ?.trim()
    .toUpperCase();
  const permissionDescription =
    (formData.get("permissionDescription") as string)?.trim() || null;
  const permissionEnabled = formData.get("permissionEnabled") === "on";

  if (!permissionCode) return { error: "Permission Code is required." };

  let newPerm;
  try {
    newPerm = await prisma.permission.create({
      data: {
        permissionCode,
        permissionDescription,
        permissionEnabled,
        registeredBy: session.user.email,
      },
    });
  } catch {
    return { error: "Failed to create permission. Code may already exist." };
  }

  logAudit({ actor: session.user.email, action: "CREATE", entity: "PERMISSION", entityId: newPerm.id, details: { permissionCode } });
  redirect("/dashboard/permissions");
}

export async function updatePermission(
  _prevState: { error: string },
  formData: FormData
) {
  await requireRole("ADMIN");
  const actor = await getActor();
  const id = Number(formData.get("id"));
  const permissionCode = (formData.get("permissionCode") as string)
    ?.trim()
    .toUpperCase();
  const permissionDescription =
    (formData.get("permissionDescription") as string)?.trim() || null;
  const permissionEnabled = formData.get("permissionEnabled") === "on";

  if (!permissionCode) return { error: "Permission Code is required." };

  try {
    await prisma.permission.update({
      where: { id },
      data: { permissionCode, permissionDescription, permissionEnabled },
    });
  } catch {
    return { error: "Failed to update permission. Code may already exist." };
  }

  logAudit({ actor, action: "UPDATE", entity: "PERMISSION", entityId: id, details: { permissionCode } });
  redirect(`/dashboard/permissions/${id}`);
}

export async function deletePermission(id: number) {
  await requireRole("ADMIN");
  const actor = await getActor();
  const perm = await prisma.permission.findUnique({ where: { id }, select: { permissionCode: true } });
  await prisma.permission.delete({ where: { id } });
  logAudit({ actor, action: "DELETE", entity: "PERMISSION", entityId: id, details: { permissionCode: perm?.permissionCode } });
  redirect("/dashboard/permissions");
}

// ─── Task ↔ Permission ──────────────────────────

export async function assignPermissionToTask(
  taskId: number,
  permissionId: number
) {
  await requireRole("ADMIN");
  const actor = await getActor();
  await prisma.taskPermission.create({
    data: { taskId, permissionId },
  });
  logAudit({ actor, action: "ASSIGN", entity: "TASK_PERMISSION", details: { taskId, permissionId } });
  revalidatePath(`/dashboard/tasks/${taskId}`);
}

export async function removePermissionFromTask(
  taskId: number,
  permissionId: number
) {
  await requireRole("ADMIN");
  const actor = await getActor();
  await prisma.taskPermission.delete({
    where: { taskId_permissionId: { taskId, permissionId } },
  });
  logAudit({ actor, action: "REMOVE", entity: "TASK_PERMISSION", details: { taskId, permissionId } });
  revalidatePath(`/dashboard/tasks/${taskId}`);
}

// ─── User ↔ Permission ──────────────────────────

export async function assignPermissionToUser(
  userId: string,
  permissionId: number
) {
  await requireRole("ADMIN");
  const actor = await getActor();
  await prisma.userPermission.create({
    data: { userId, permissionId },
  });
  logAudit({ actor, action: "ASSIGN", entity: "USER_PERMISSION", details: { userId, permissionId } });
  revalidatePath(`/dashboard/permissions`);
}

export async function removePermissionFromUser(
  userId: string,
  permissionId: number
) {
  await requireRole("ADMIN");
  const actor = await getActor();
  await prisma.userPermission.delete({
    where: { userId_permissionId: { userId, permissionId } },
  });
  logAudit({ actor, action: "REMOVE", entity: "USER_PERMISSION", details: { userId, permissionId } });
  revalidatePath(`/dashboard/permissions`);
}

// ─── Tech ↔ Permission ──────────────────────────

export async function createTechPermission(
  _prevState: { error: string },
  formData: FormData
) {
  await requireRole("ADMIN");
  const actor = await getActor();
  const techName = (formData.get("techName") as string)?.trim();
  const techEmail = (formData.get("techEmail") as string)?.trim().toLowerCase();
  const permissionId = Number(formData.get("permissionId"));

  if (!techName) return { error: "Technician name is required." };
  if (!techEmail) return { error: "Technician email is required." };
  if (!permissionId) return { error: "Permission is required." };

  try {
    await prisma.techPermission.create({
      data: { techName, techEmail, permissionId },
    });
  } catch {
    return { error: "This technician already has this permission." };
  }

  logAudit({ actor, action: "ASSIGN", entity: "TECH_PERMISSION", details: { techName, techEmail, permissionId } });
  revalidatePath(`/dashboard/permissions/${permissionId}`);
  return { error: "" };
}

export async function removeTechPermission(id: number, permissionId: number) {
  await requireRole("ADMIN");
  const actor = await getActor();
  await prisma.techPermission.delete({ where: { id } });
  logAudit({ actor, action: "REMOVE", entity: "TECH_PERMISSION", entityId: id, details: { permissionId } });
  revalidatePath(`/dashboard/permissions/${permissionId}`);
}
