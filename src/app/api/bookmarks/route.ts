import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json([], { status: 401 });

  // Single-entity check mode
  const check = req.nextUrl.searchParams.get("check");
  if (check) {
    const separatorIndex = check.indexOf(":");
    if (separatorIndex === -1) {
      return NextResponse.json({ bookmarked: false });
    }
    const entityType = check.substring(0, separatorIndex);
    const entityId = check.substring(separatorIndex + 1);
    const exists = await prisma.bookmark.findUnique({
      where: {
        userId_entityType_entityId: {
          userId: session.user.id,
          entityType,
          entityId,
        },
      },
      select: { id: true },
    });
    return NextResponse.json({ bookmarked: !!exists });
  }

  // List mode (existing logic)
  const limit = Number(req.nextUrl.searchParams.get("limit")) || 20;
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(bookmarks);
}

const ALLOWED_ENTITY_TYPES = ["tenant", "task", "runbook", "technician", "ad_user", "ad_group"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { entityType, entityId, label, metadata } = await req.json();
  if (!entityType || !entityId || !label) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!ALLOWED_ENTITY_TYPES.includes(entityType)) {
    return NextResponse.json({ error: "Invalid entity type" }, { status: 400 });
  }

  if (typeof label !== "string" || label.length > 200) {
    return NextResponse.json({ error: "Label is required and max 200 chars" }, { status: 400 });
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
