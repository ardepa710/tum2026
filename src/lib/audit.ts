import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function getActor(): Promise<string> {
  const session = await auth();
  return session?.user?.email ?? "system";
}

export function logAudit(params: {
  actor: string;
  action: string;
  entity: string;
  entityId?: string | number;
  details?: Record<string, unknown>;
}) {
  // Fire-and-forget — never block the calling action
  prisma.auditLog
    .create({
      data: {
        actor: params.actor,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId != null ? String(params.entityId) : null,
        details: params.details ? JSON.stringify(params.details) : null,
      },
    })
    .catch((err) => {
      console.error("Audit log failed:", err);
    });
}
