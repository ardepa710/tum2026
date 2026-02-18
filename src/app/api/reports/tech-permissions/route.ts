import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const techPerms = await prisma.techPermission.findMany({
    include: {
      permission: {
        select: {
          permissionCode: true,
          permissionDescription: true,
        },
      },
    },
    orderBy: { techName: "asc" },
  });

  const rows = techPerms.map((tp) => ({
    technician: tp.techName,
    email: tp.techEmail,
    permission: tp.permission.permissionCode,
    description: tp.permission.permissionDescription || "",
  }));

  return Response.json(rows);
}
