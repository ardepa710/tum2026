import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const techEmail = session.user.email;

  // Get technician's permission IDs
  const techPerms = await prisma.techPermission.findMany({
    where: { techEmail },
    select: { permissionId: true },
  });
  const techPermIds = new Set(techPerms.map((tp) => tp.permissionId));

  // Get all tasks with their required permissions
  const allTasks = await prisma.masterTask.findMany({
    include: {
      taskPermissions: {
        select: { permissionId: true },
      },
    },
    orderBy: { id: "asc" },
  });

  // Filter: task is available if ALL its required permissions are in technician's set
  // Tasks with no required permissions are available to everyone
  const available = allTasks.filter((task) => {
    if (task.taskPermissions.length === 0) return true;
    return task.taskPermissions.every((tp) => techPermIds.has(tp.permissionId));
  });

  return NextResponse.json(
    available.map((t) => ({
      id: t.id,
      taskName: t.taskName,
      taskCode: t.taskCode,
      taskDetails: t.taskDetails,
      ticketRequired: t.ticketRequired,
      usernameRequired: t.usernameRequired,
      syncRequired: t.syncRequired,
      rewstWebhook: t.rewstWebhook,
      tenantExclusive: t.tenantExclusive,
    }))
  );
}
