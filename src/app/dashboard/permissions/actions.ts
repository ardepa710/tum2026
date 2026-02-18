"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// ─── CRUD ────────────────────────────────────────

export async function createPermission(
  _prevState: { error: string },
  formData: FormData
) {
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

  try {
    await prisma.permission.create({
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

  redirect("/dashboard/permissions");
}

export async function updatePermission(
  _prevState: { error: string },
  formData: FormData
) {
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

  redirect(`/dashboard/permissions/${id}`);
}

export async function deletePermission(id: number) {
  await prisma.permission.delete({ where: { id } });
  redirect("/dashboard/permissions");
}

// ─── Task ↔ Permission ──────────────────────────

export async function assignPermissionToTask(
  taskId: number,
  permissionId: number
) {
  await prisma.taskPermission.create({
    data: { taskId, permissionId },
  });
  revalidatePath(`/dashboard/tasks/${taskId}`);
}

export async function removePermissionFromTask(
  taskId: number,
  permissionId: number
) {
  await prisma.taskPermission.delete({
    where: { taskId_permissionId: { taskId, permissionId } },
  });
  revalidatePath(`/dashboard/tasks/${taskId}`);
}

// ─── User ↔ Permission ──────────────────────────

export async function assignPermissionToUser(
  userId: string,
  permissionId: number
) {
  await prisma.userPermission.create({
    data: { userId, permissionId },
  });
  revalidatePath(`/dashboard/permissions`);
}

export async function removePermissionFromUser(
  userId: string,
  permissionId: number
) {
  await prisma.userPermission.delete({
    where: { userId_permissionId: { userId, permissionId } },
  });
  revalidatePath(`/dashboard/permissions`);
}

// ─── Tech ↔ Permission ──────────────────────────

export async function createTechPermission(
  _prevState: { error: string },
  formData: FormData
) {
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

  revalidatePath(`/dashboard/permissions/${permissionId}`);
  return { error: "" };
}

export async function removeTechPermission(id: number, permissionId: number) {
  await prisma.techPermission.delete({ where: { id } });
  revalidatePath(`/dashboard/permissions/${permissionId}`);
}
