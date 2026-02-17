import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getGroupDetail,
  getGroupMembers,
  getGroupOwners,
} from "@/lib/graph";
import type { GroupDetailResponse } from "@/lib/types/group-detail";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, groupId } = await params;
  const tenantId = Number(id);
  if (isNaN(tenantId)) {
    return NextResponse.json({ error: "Invalid tenant ID" }, { status: 400 });
  }

  if (!groupId) {
    return NextResponse.json({ error: "Group ID required" }, { status: 400 });
  }

  try {
    const [groupResult, membersResult, ownersResult] =
      await Promise.allSettled([
        getGroupDetail(tenantId, groupId),
        getGroupMembers(tenantId, groupId),
        getGroupOwners(tenantId, groupId),
      ]);

    if (groupResult.status === "rejected" || !groupResult.value) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    const response: GroupDetailResponse = {
      group: groupResult.value,
      members:
        membersResult.status === "fulfilled" ? membersResult.value : [],
      owners:
        ownersResult.status === "fulfilled" ? ownersResult.value : [],
    };

    return NextResponse.json(response);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch group details";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
