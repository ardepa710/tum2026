import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { executePowerShell } from "@/lib/sentinel-agent";
import { psRemoveGroupMember } from "@/lib/ad-scripts";
import { syncSingleGroup, syncSingleUser } from "@/lib/ad-sync";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; name: string; userSam: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, name, userSam } = await params;
  const tenantId = Number(id);
  const groupSam = decodeURIComponent(name);
  const decodedUserSam = decodeURIComponent(userSam);

  if (isNaN(tenantId)) {
    return NextResponse.json({ error: "Invalid tenant ID" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { adAgentId: true },
  });
  if (!tenant?.adAgentId) {
    return NextResponse.json({ error: "No SentinelAgent configured for this tenant" }, { status: 422 });
  }

  const result = await executePowerShell(
    tenant.adAgentId,
    psRemoveGroupMember(groupSam, decodedUserSam),
    30
  );
  if (result.exitCode !== 0) {
    return NextResponse.json(
      { error: `Remove-ADGroupMember failed: ${result.stderr || result.stdout}` },
      { status: 502 }
    );
  }

  // Post-op sync
  await Promise.all([
    syncSingleGroup(tenantId, tenant.adAgentId, groupSam),
    syncSingleUser(tenantId, tenant.adAgentId, decodedUserSam),
  ]);

  await prisma.auditLog.create({
    data: {
      actor: session.user.email ?? "unknown",
      action: "AD_GROUP_MEMBER_REMOVE",
      entity: "AdGroup",
      entityId: `${tenantId}:${groupSam}`,
      details: JSON.stringify({ tenantId, groupSam, userSam: decodedUserSam }),
    },
  });

  return NextResponse.json({ ok: true });
}
