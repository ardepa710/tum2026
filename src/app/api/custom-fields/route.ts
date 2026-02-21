import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const ALLOWED_ENTITY_TYPES = ["tenant", "task"];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json([], { status: 401 });

  const entityType = req.nextUrl.searchParams.get("entityType");
  if (!entityType) return NextResponse.json([]);

  if (!ALLOWED_ENTITY_TYPES.includes(entityType)) {
    return NextResponse.json({ error: "Invalid entity type" }, { status: 400 });
  }

  const fields = await prisma.customField.findMany({
    where: { entityType },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(fields);
}
