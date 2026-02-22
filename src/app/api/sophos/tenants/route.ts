import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSophosPartnerTenants } from "@/lib/sophos";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenants = await getSophosPartnerTenants();
    return NextResponse.json(tenants);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to fetch Sophos tenants",
      },
      { status: 500 },
    );
  }
}
