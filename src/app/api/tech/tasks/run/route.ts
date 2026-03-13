/**
 * POST /api/tech/tasks/run
 *
 * Executes a MasterTask for a given AD user by calling the n8n webhook.
 * Creates a TaskRun record (RUNNING → SUCCESS/FAILED) and returns it.
 *
 * Body: { taskId, targetUser, tenantId, ticketNumber?, additionalData? }
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSessionRole, hasMinRole } from "@/lib/rbac";
import { requireTenantAccess } from "@/lib/tenant-auth";
import type { TaskFieldSchema } from "@/lib/types/task-schema";

const WEBHOOK_URL = process.env.N8N_WEBHOOK_URL!;
const WEBHOOK_USER = process.env.N8N_WEBHOOK_USER!;
const WEBHOOK_PASSWORD = process.env.N8N_WEBHOOK_PASSWORD!;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getSessionRole();
  if (!hasMinRole(role, "EDITOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { taskId, targetUser, tenantId, ticketNumber, additionalData } = body as {
    taskId?: number;
    targetUser?: string;
    tenantId?: number;
    ticketNumber?: string | number;
    additionalData?: Record<string, unknown>;
  };

  if (!taskId || typeof taskId !== "number") {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }
  if (!targetUser || typeof targetUser !== "string") {
    return NextResponse.json({ error: "targetUser is required" }, { status: 400 });
  }
  if (!tenantId || typeof tenantId !== "number") {
    return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
  }

  // Verify tenant access
  const deny = await requireTenantAccess(tenantId);
  if (deny) return deny;

  // Load task
  const task = await prisma.masterTask.findUnique({
    where: { id: taskId },
    include: { taskPermissions: { select: { permissionId: true } } },
  });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Verify technician has permission for this task
  if (task.taskPermissions.length > 0) {
    const techPerms = await prisma.techPermission.findMany({
      where: { techEmail: session.user.email },
      select: { permissionId: true },
    });
    const techPermIds = new Set(techPerms.map((tp) => tp.permissionId));
    const hasAll = task.taskPermissions.every((tp) => techPermIds.has(tp.permissionId));
    if (!hasAll) {
      return NextResponse.json({ error: "Insufficient permissions for this task" }, { status: 403 });
    }
  }

  // Validate ticketRequired
  if (task.ticketRequired && !ticketNumber) {
    return NextResponse.json(
      { error: "Ticket number is required for this task" },
      { status: 400 }
    );
  }

  // Validate additionalData against schema
  if (task.additionalDataSchema) {
    let schema: TaskFieldSchema[] = [];
    try {
      schema = JSON.parse(task.additionalDataSchema) as TaskFieldSchema[];
    } catch {
      // malformed schema in DB — skip validation, proceed
    }
    const missingFields = schema
      .filter((f) => f.required)
      .filter((f) => {
        const val = additionalData?.[f.name];
        return val === undefined || val === null || val === "";
      })
      .map((f) => f.label);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Required fields missing: ${missingFields.join(", ")}` },
        { status: 400 }
      );
    }
  }

  // Create TaskRun record (RUNNING)
  const taskRun = await prisma.taskRun.create({
    data: {
      taskId: task.id,
      tenantId,
      targetUser,
      actor: session.user.email,
      status: "RUNNING",
      ticketNumber: ticketNumber != null ? String(ticketNumber) : null,
    },
  });

  // Call n8n webhook
  const startedAt = Date.now();
  let webhookOk = false;
  let webhookOutput = "";
  let webhookError = "";

  try {
    const credentials = Buffer.from(`${WEBHOOK_USER}:${WEBHOOK_PASSWORD}`).toString("base64");
    const webhookRes = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        ticket_number: ticketNumber ?? 0,
        tech_email: session.user.email,
        username: targetUser,
        additional_data: additionalData ?? {},
        task_code: task.taskCode,
      }),
    });

    webhookOk = webhookRes.ok;
    webhookOutput = await webhookRes.text().catch(() => "");
    if (!webhookRes.ok) {
      webhookError = `Webhook returned ${webhookRes.status}: ${webhookOutput}`;
    }
  } catch (err) {
    webhookError = err instanceof Error ? err.message : "Webhook call failed";
  }

  const durationMs = Date.now() - startedAt;

  // Update TaskRun with result
  const updatedRun = await prisma.taskRun.update({
    where: { id: taskRun.id },
    data: {
      status: webhookOk ? "SUCCESS" : "FAILED",
      output: webhookOutput || null,
      errorMessage: webhookError || null,
      durationMs,
      completedAt: new Date(),
    },
  });

  if (!webhookOk) {
    return NextResponse.json(
      { ok: false, error: webhookError, taskRun: updatedRun },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, taskRun: updatedRun });
}
