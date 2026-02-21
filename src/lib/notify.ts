import { prisma } from "@/lib/prisma";

type NotificationCategory = "task_run" | "task_fail" | "tech_sync" | "new_tenant";

const CATEGORY_TO_PREF = {
  task_run: "onTaskRun",
  task_fail: "onTaskFail",
  tech_sync: "onTechSync",
  new_tenant: "onNewTenant",
} as const;

/**
 * Fire-and-forget notification creation with preference enforcement.
 * If category is provided, checks user preferences before creating.
 * If category is null/undefined, always creates (backwards compatible).
 */
export function createNotification(params: {
  userId: string;
  title: string;
  body?: string;
  link?: string;
  category?: NotificationCategory;
}) {
  (async () => {
    if (params.category) {
      const prefField = CATEGORY_TO_PREF[params.category];
      const pref = await prisma.notificationPreference.findUnique({
        where: { userId: params.userId },
      });
      // If preference exists and category is disabled, skip
      if (pref && !pref[prefField]) return;
      // No pref record → defaults are all true → proceed
    }

    await prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        body: params.body ?? null,
        link: params.link ?? null,
      },
    });
  })().catch((err) => {
    console.error("Notification creation failed:", err);
  });
}
