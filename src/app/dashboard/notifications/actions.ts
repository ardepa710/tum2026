"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function markAllAsRead() {
  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  });

  revalidatePath("/dashboard/notifications");
}

export async function markAsRead(id: number) {
  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.notification.updateMany({
    where: { id, userId: session.user.id },
    data: { isRead: true },
  });

  revalidatePath("/dashboard/notifications");
}

export async function deleteNotification(id: number) {
  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.notification.deleteMany({
    where: { id, userId: session.user.id },
  });

  revalidatePath("/dashboard/notifications");
}
