/**
 * GET  /api/tenants/[id]/ad/users/[sam]
 * POST /api/tenants/[id]/ad/users/[sam]
 *
 * GET: Returns the single AdUser from local DB.
 * POST body: { action: "disable" | "enable" | "unlock" | "reset-password", password?: string }
 *   Executes the PowerShell operation via SentinelAgent, then syncs the user
 *   back to the local DB to keep the snapshot fresh.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { executePowerShell } from "@/lib/sentinel-agent";
import {
  psDisableUser,
  psEnableUser,
  psUnlockUser,
  psResetPassword,
} from "@/lib/ad-scripts";
import { syncSingleUser } from "@/lib/ad-sync";

type AdUserAction = "disable" | "enable" | "unlock" | "reset-password";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; sam: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, sam } = await params;
  const tenantId = Number(id);
  if (isNaN(tenantId)) {
    return NextResponse.json({ error: "Invalid tenant ID" }, { status: 400 });
  }

  const user = await prisma.adUser.findUnique({
    where: { tenantId_samAccountName: { tenantId, samAccountName: decodeURIComponent(sam) } },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sam: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, sam } = await params;
  const tenantId = Number(id);
  if (isNaN(tenantId)) {
    return NextResponse.json({ error: "Invalid tenant ID" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action as AdUserAction | undefined;
  if (!action || !["disable", "enable", "unlock", "reset-password"].includes(action)) {
    return NextResponse.json(
      { error: "Invalid action. Use: disable | enable | unlock | reset-password" },
      { status: 400 }
    );
  }

  if (action === "reset-password" && !body.password) {
    return NextResponse.json({ error: "Password is required for reset-password" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { adAgentId: true },
  });
  if (!tenant?.adAgentId) {
    return NextResponse.json({ error: "No SentinelAgent configured for this tenant" }, { status: 422 });
  }

  // Build the PowerShell script for the requested action
  const scriptMap: Record<AdUserAction, string> = {
    disable: psDisableUser(sam),
    enable: psEnableUser(sam),
    unlock: psUnlockUser(sam),
    "reset-password": psResetPassword(sam, body.password as string),
  };

  const result = await executePowerShell(tenant.adAgentId, scriptMap[action], 30);
  if (result.exitCode !== 0) {
    return NextResponse.json(
      { error: `AD operation failed: ${result.stderr || result.stdout}` },
      { status: 502 }
    );
  }

  // Post-op sync: refresh this user in the DB
  await syncSingleUser(tenantId, tenant.adAgentId, sam);

  // Audit log
  await prisma.auditLog.create({
    data: {
      actor: session.user.email ?? "unknown",
      action: `AD_USER_${action.toUpperCase().replace("-", "_")}`,
      entity: "AdUser",
      entityId: `${tenantId}:${sam}`,
      details: JSON.stringify({ tenantId, samAccountName: sam, action }),
    },
  });

  const updatedUser = await prisma.adUser.findUnique({
    where: { tenantId_samAccountName: { tenantId, samAccountName: sam } },
  });

  return NextResponse.json({ ok: true, user: updatedUser });
}
