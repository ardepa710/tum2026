/**
 * Group membership management
 *
 * POST   /api/tenants/[id]/ad/groups/[name]/members
 *   Body: { samAccountName: string }  → adds user to group
 *
 * DELETE /api/tenants/[id]/ad/groups/[name]/members/[userSam]
 *   → removes user from group
 *
 * [name] = group SamAccountName (URL-encoded if needed)
 * Both operations sync group + user back to DB after execution.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { executePowerShell } from "@/lib/sentinel-agent";
import { psAddGroupMember, psRemoveGroupMember } from "@/lib/ad-scripts";
import { syncSingleGroup, syncSingleUser } from "@/lib/ad-sync";

async function getAgentId(tenantId: number): Promise<string | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { adAgentId: true },
  });
  return tenant?.adAgentId ?? null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; name: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, name } = await params;
  const tenantId = Number(id);
  const groupSam = decodeURIComponent(name);

  if (isNaN(tenantId)) {
    return NextResponse.json({ error: "Invalid tenant ID" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const userSam = body.samAccountName as string | undefined;
  if (!userSam?.trim()) {
    return NextResponse.json({ error: "samAccountName is required" }, { status: 400 });
  }

  const agentId = await getAgentId(tenantId);
  if (!agentId) {
    return NextResponse.json({ error: "No SentinelAgent configured for this tenant" }, { status: 422 });
  }

  const result = await executePowerShell(agentId, psAddGroupMember(groupSam, userSam), 30);
  if (result.exitCode !== 0) {
    return NextResponse.json(
      { error: `Add-ADGroupMember failed: ${result.stderr || result.stdout}` },
      { status: 502 }
    );
  }

  // Post-op sync
  await Promise.all([
    syncSingleGroup(tenantId, agentId, groupSam),
    syncSingleUser(tenantId, agentId, userSam),
  ]);

  await prisma.auditLog.create({
    data: {
      actor: session.user.email ?? "unknown",
      action: "AD_GROUP_MEMBER_ADD",
      entity: "AdGroup",
      entityId: `${tenantId}:${groupSam}`,
      details: JSON.stringify({ tenantId, groupSam, userSam }),
    },
  });

  return NextResponse.json({ ok: true });
}
