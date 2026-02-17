import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUsers } from "@/lib/graph";

export async function GET(
  _request: NextRequest,
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

  try {
    const users = await getUsers(tenantId);
    return NextResponse.json(users);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch users";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
