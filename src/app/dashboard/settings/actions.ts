"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function updateNotificationPrefs(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;

  const data = {
    onTaskRun: formData.get("onTaskRun") === "on",
    onTaskFail: formData.get("onTaskFail") === "on",
    onTechSync: formData.get("onTechSync") === "on",
    onNewTenant: formData.get("onNewTenant") === "on",
  };

  await prisma.notificationPreference.upsert({
    where: { userId: session.user.id },
    update: data,
    create: { userId: session.user.id, ...data },
  });

  logAudit({
    actor: session.user.email ?? "unknown",
    action: "UPDATE",
    entity: "NOTIFICATION_PREFS",
    entityId: session.user.id,
    details: data,
  });
}
