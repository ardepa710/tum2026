import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const ALLOWED_ENTITY_TYPES = ["tenant", "task"];

// GET ?entityType=tenant&entityId=5 → fields with their values
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json([], { status: 401 });

  const entityType = req.nextUrl.searchParams.get("entityType");
  const entityId = req.nextUrl.searchParams.get("entityId");
  if (!entityType || !entityId) return NextResponse.json([]);

  if (!ALLOWED_ENTITY_TYPES.includes(entityType)) {
    return NextResponse.json({ error: "Invalid entity type" }, { status: 400 });
  }

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

  // Type checks
  if (typeof fieldId !== "number" || typeof entityType !== "string" || typeof entityId !== "string" || typeof value !== "string") {
    return NextResponse.json({ error: "Invalid parameter types" }, { status: 400 });
  }

  if (!fieldId || !entityType || !entityId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!ALLOWED_ENTITY_TYPES.includes(entityType)) {
    return NextResponse.json({ error: "Invalid entity type" }, { status: 400 });
  }

  if (value.length > 10000) {
    return NextResponse.json({ error: "Value too long (max 10000 chars)" }, { status: 400 });
  }

  // Fetch field definition
  const field = await prisma.customField.findUnique({ where: { id: fieldId } });
  if (!field) {
    return NextResponse.json({ error: "Field not found" }, { status: 404 });
  }

  // Validate value against field type
  if (value.trim()) {
    if (field.fieldType === "number" && isNaN(Number(value))) {
      return NextResponse.json({ error: "Value must be a number" }, { status: 400 });
    }
    if (field.fieldType === "date" && isNaN(Date.parse(value))) {
      return NextResponse.json({ error: "Value must be a valid date" }, { status: 400 });
    }
    if (field.fieldType === "select" && field.options) {
      const validOptions = field.options.split(",").map((o) => o.trim());
      if (!validOptions.includes(value.trim())) {
        return NextResponse.json({ error: "Value must be one of the allowed options" }, { status: 400 });
      }
    }
  }

  // Check required constraint
  if (field.isRequired && !value.trim()) {
    return NextResponse.json({ error: `${field.fieldName} is required` }, { status: 400 });
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
