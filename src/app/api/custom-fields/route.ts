import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json([], { status: 401 });

  const entityType = req.nextUrl.searchParams.get("entityType");
  if (!entityType) return NextResponse.json([]);

  const fields = await prisma.customField.findMany({
    where: { entityType },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(fields);
}
