"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { logAudit, getActor } from "@/lib/audit";
import { requireRole } from "@/lib/rbac";

export async function createRunbook(
  _prevState: { error: string },
  formData: FormData
) {
  await requireRole("EDITOR");
  const actor = await getActor();
  const title = (formData.get("title") as string)?.trim();
  const category = (formData.get("category") as string)?.trim();
  const content = (formData.get("content") as string) || "";
  const taskId = formData.get("taskId") ? Number(formData.get("taskId")) : null;

  if (!title) return { error: "Title is required." };
  if (!category) return { error: "Category is required." };

  let runbook;
  try {
    runbook = await prisma.runbook.create({
      data: { title, category, content, taskId, createdBy: actor },
    });
  } catch {
    return { error: "Failed to create runbook." };
  }

  logAudit({
    actor,
    action: "CREATE",
    entity: "RUNBOOK",
    entityId: runbook.id,
    details: { title, category },
  });
  redirect(`/dashboard/runbooks/${runbook.id}`);
}

export async function updateRunbook(
  _prevState: { error: string },
  formData: FormData
) {
  await requireRole("EDITOR");
  const actor = await getActor();
  const id = Number(formData.get("id"));
  const title = (formData.get("title") as string)?.trim();
  const category = (formData.get("category") as string)?.trim();
  const content = (formData.get("content") as string) || "";
  const taskId = formData.get("taskId") ? Number(formData.get("taskId")) : null;

  if (!title) return { error: "Title is required." };
  if (!category) return { error: "Category is required." };

  try {
    await prisma.runbook.update({
      where: { id },
      data: { title, category, content, taskId },
    });
  } catch {
    return { error: "Failed to update runbook." };
  }

  logAudit({
    actor,
    action: "UPDATE",
    entity: "RUNBOOK",
    entityId: id,
    details: { title, category },
  });
  redirect(`/dashboard/runbooks/${id}`);
}

export async function deleteRunbook(id: number) {
  await requireRole("EDITOR");
  const actor = await getActor();
  const runbook = await prisma.runbook.findUnique({
    where: { id },
    select: { title: true },
  });
  await prisma.runbook.delete({ where: { id } });
  logAudit({
    actor,
    action: "DELETE",
    entity: "RUNBOOK",
    entityId: id,
    details: { title: runbook?.title },
  });
  redirect("/dashboard/runbooks");
}
