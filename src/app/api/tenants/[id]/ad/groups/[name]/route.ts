/**
 * GET  /api/tenants/[id]/ad/groups/[name]
 * Returns a single AD group with all its members from the local DB.
 *
 * POST /api/tenants/[id]/ad/groups/[name]/members  ← handled in /members/route.ts
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; name: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, name } = await params;
  const tenantId = Number(id);
  if (isNaN(tenantId)) {
    return NextResponse.json({ error: "Invalid tenant ID" }, { status: 400 });
  }

  const samAccountName = decodeURIComponent(name);

  const group = await prisma.adGroup.findUnique({
    where: { tenantId_samAccountName: { tenantId, samAccountName } },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const memberRecords = await prisma.adGroupMember.findMany({
    where: { tenantId, groupSam: samAccountName },
  });

  const members = memberRecords.length > 0
    ? await prisma.adUser.findMany({
        where: { tenantId, upn: { in: memberRecords.map((m) => m.userUpn) } },
        select: {
          id: true,
          displayName: true,
          samAccountName: true,
          mail: true,
          upn: true,
          jobTitle: true,
          department: true,
          accountEnabled: true,
          lockedOut: true,
        },
        orderBy: { displayName: "asc" },
      })
    : [];

  return NextResponse.json({ ...group, members });
}
