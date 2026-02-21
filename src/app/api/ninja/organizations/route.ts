import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getNinjaOrganizations } from "@/lib/ninja";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const orgs = await getNinjaOrganizations();
    return NextResponse.json(orgs);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to fetch NinjaOne organizations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
