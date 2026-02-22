import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: raw } = await params;
  const id = Number(raw);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid cross-link ID" }, { status: 400 });
  }

  try {
    await prisma.deviceCrossLink.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    // Prisma P2025 = record not found
    if (
      e instanceof Error &&
      "code" in e &&
      (e as unknown as { code: string }).code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Cross-link not found" },
        { status: 404 },
      );
    }
    const message =
      e instanceof Error ? e.message : "Failed to delete cross-link";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
