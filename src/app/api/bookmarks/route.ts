import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json([], { status: 401 });

  const limit = Number(req.nextUrl.searchParams.get("limit")) || 20;
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(bookmarks);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { entityType, entityId, label, metadata } = await req.json();
  if (!entityType || !entityId || !label) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const bookmark = await prisma.bookmark.upsert({
    where: {
      userId_entityType_entityId: {
        userId: session.user.id,
        entityType,
        entityId: String(entityId),
      },
    },
    update: { label, metadata: metadata ? JSON.stringify(metadata) : null },
    create: {
      userId: session.user.id,
      entityType,
      entityId: String(entityId),
      label,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });

  return NextResponse.json(bookmark);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entityType = req.nextUrl.searchParams.get("entityType");
  const entityId = req.nextUrl.searchParams.get("entityId");
  if (!entityType || !entityId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  await prisma.bookmark.deleteMany({
    where: { userId: session.user.id, entityType, entityId },
  });

  return NextResponse.json({ ok: true });
}
