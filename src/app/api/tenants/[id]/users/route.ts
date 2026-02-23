import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
    // Quick check: does the tenant exist and have Azure AD configured?
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { tenantIdMsft: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 },
      );
    }

    if (!tenant.tenantIdMsft) {
      return NextResponse.json(
        {
          error:
            "This tenant has no Azure AD (Entra ID) credentials configured. Set the Microsoft Tenant ID in tenant settings.",
        },
        { status: 422 },
      );
    }

    const users = await getUsers(tenantId);
    return NextResponse.json(users);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch users";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
