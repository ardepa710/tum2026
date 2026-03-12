import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const department = searchParams.get("department") ?? "";
  const status = searchParams.get("status") ?? ""; // "enabled" | "disabled" | "locked"

  const users = await prisma.adUser.findMany({
    where: {
      tenantId,
      ...(search && {
        OR: [
          { displayName: { contains: search, mode: "insensitive" } },
          { samAccountName: { contains: search, mode: "insensitive" } },
          { mail: { contains: search, mode: "insensitive" } },
          { upn: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(department && { department: { equals: department, mode: "insensitive" } }),
      ...(status === "enabled" && { accountEnabled: true }),
      ...(status === "disabled" && { accountEnabled: false }),
      ...(status === "locked" && { lockedOut: true }),
    },
    orderBy: { displayName: "asc" },
    select: {
      id: true,
      samAccountName: true,
      displayName: true,
      mail: true,
      upn: true,
      accountEnabled: true,
      lockedOut: true,
      jobTitle: true,
      department: true,
      lastLogonDate: true,
      passwordExpired: true,
      passwordLastSet: true,
      syncedAt: true,
    },
  });

  return NextResponse.json(users);
}
