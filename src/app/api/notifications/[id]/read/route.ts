import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const notificationId = parseInt(id, 10);
  if (isNaN(notificationId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  // Verify ownership before updating
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId: session.user.id },
  });

  if (!notification) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  return NextResponse.json(updated);
}
