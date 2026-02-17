import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUserDetail,
  getUserMemberOf,
  getUserLicenseDetails,
  getUserMailboxSettings,
  getUserManager,
} from "@/lib/graph";
import type { UserDetailResponse } from "@/lib/types/user-detail";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, userId } = await params;
  const tenantId = Number(id);
  if (isNaN(tenantId)) {
    return NextResponse.json({ error: "Invalid tenant ID" }, { status: 400 });
  }

  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  try {
    const [userResult, memberOfResult, licensesResult, mailboxResult, managerResult] =
      await Promise.allSettled([
        getUserDetail(tenantId, userId),
        getUserMemberOf(tenantId, userId),
        getUserLicenseDetails(tenantId, userId),
        getUserMailboxSettings(tenantId, userId),
        getUserManager(tenantId, userId),
      ]);

    // User profile is required — if it fails, return 404
    if (userResult.status === "rejected" || !userResult.value) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const response: UserDetailResponse = {
      user: userResult.value,
      memberOf:
        memberOfResult.status === "fulfilled" ? memberOfResult.value : [],
      licenses:
        licensesResult.status === "fulfilled" ? licensesResult.value : [],
      mailboxSettings:
        mailboxResult.status === "fulfilled" ? mailboxResult.value : null,
      manager:
        managerResult.status === "fulfilled" ? managerResult.value : null,
    };

    return NextResponse.json(response);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch user details";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
