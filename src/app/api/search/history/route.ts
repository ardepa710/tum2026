import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET — last 5 unique recent searches
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json([]);

  const history = await prisma.searchHistory.findMany({
    where: { userId: session.user.id },
    orderBy: { searchedAt: "desc" },
    take: 20,
  });

  // Deduplicate by resultType+resultId, keep first 5
  const seen = new Set<string>();
  const unique = [];
  for (const h of history) {
    const key = `${h.resultType}:${h.resultId}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(h);
    }
    if (unique.length >= 5) break;
  }

  return NextResponse.json(unique);
}

// POST — save a search entry
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { query, resultType, resultId, clickedLabel } = await req.json();
  if (!query || !resultType || !resultId || !clickedLabel) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await prisma.searchHistory.create({
    data: {
      userId: session.user.id,
      query,
      resultType: String(resultType),
      resultId: String(resultId),
      clickedLabel,
    },
  });

  return NextResponse.json({ ok: true });
}

// DELETE — clear all history
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.searchHistory.deleteMany({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
