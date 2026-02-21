import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET ?entityType=tenant&entityId=5 → fields with their values
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json([], { status: 401 });

  const entityType = req.nextUrl.searchParams.get("entityType");
  const entityId = req.nextUrl.searchParams.get("entityId");
  if (!entityType || !entityId) return NextResponse.json([]);

  const fields = await prisma.customField.findMany({
    where: { entityType },
    orderBy: { sortOrder: "asc" },
    include: {
      values: {
        where: { entityType, entityId },
        take: 1,
      },
    },
  });

  // Flatten: each field + its value (or empty string)
  const result = fields.map((f) => ({
    fieldId: f.id,
    fieldName: f.fieldName,
    fieldType: f.fieldType,
    options: f.options,
    isRequired: f.isRequired,
    value: f.values[0]?.value ?? "",
  }));

  return NextResponse.json(result);
}

// PUT — upsert a field value
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fieldId, entityType, entityId, value } = await req.json();
  if (!fieldId || !entityType || !entityId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await prisma.customFieldValue.upsert({
    where: {
      fieldId_entityType_entityId: {
        fieldId,
        entityType,
        entityId: String(entityId),
      },
    },
    update: { value: String(value), updatedBy: session.user.email },
    create: {
      fieldId,
      entityType,
      entityId: String(entityId),
      value: String(value),
      updatedBy: session.user.email,
    },
  });

  return NextResponse.json({ ok: true });
}
