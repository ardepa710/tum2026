import { prisma } from "@/lib/prisma";

/**
 * Fire-and-forget notification creation.
 * Same pattern as logAudit — never blocks the calling action.
 */
export function createNotification(params: {
  userId: string;
  title: string;
  body?: string;
  link?: string;
}) {
  prisma.notification
    .create({
      data: {
        userId: params.userId,
        title: params.title,
        body: params.body ?? null,
        link: params.link ?? null,
      },
    })
    .catch((err) => {
      console.error("Notification creation failed:", err);
    });
}
