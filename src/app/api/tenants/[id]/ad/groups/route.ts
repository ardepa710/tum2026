import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireTenantAccess } from "@/lib/tenant-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tenantId = Number(id);
  if (isNaN(tenantId)) {
    return NextResponse.json({ error: "Invalid tenant ID" }, { status: 400 });
  }

  const deny = await requireTenantAccess(tenantId);
  if (deny) return deny;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const category = searchParams.get("category") ?? ""; // "Security" | "Distribution"

  const groups = await prisma.adGroup.findMany({
    where: {
      tenantId,
      ...(search && {
        OR: [
          { displayName: { contains: search, mode: "insensitive" } },
          { samAccountName: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(category && { groupCategory: category }),
    },
    orderBy: { displayName: "asc" },
    select: {
      id: true,
      samAccountName: true,
      displayName: true,
      description: true,
      groupCategory: true,
      groupScope: true,
      memberCount: true,
      syncedAt: true,
    },
  });

  return NextResponse.json(groups);
}
