import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function getActor(): Promise<string> {
  const session = await auth();
  return session?.user?.email ?? "system";
}

/**
 * NH-03 fix: logAudit with retry (up to 2 attempts) + stderr on failure.
 * Audit failures are surfaced to server logs so they are never silently lost.
 * Non-blocking: awaits internally but does not throw to the caller.
 */
export function logAudit(params: {
  actor: string;
  action: string;
  entity: string;
  entityId?: string | number;
  details?: Record<string, unknown>;
}) {
  const data = {
    actor: params.actor,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId != null ? String(params.entityId) : null,
    details: params.details ? JSON.stringify(params.details) : null,
  };

  const attempt = async (retriesLeft: number): Promise<void> => {
    try {
      await prisma.auditLog.create({ data });
    } catch (err) {
      if (retriesLeft > 0) {
        await new Promise((r) => setTimeout(r, 500));
        return attempt(retriesLeft - 1);
      }
      // All retries exhausted — log to stderr so the issue surfaces in Vercel logs
      console.error("[audit] FAILED to write audit log after retries:", {
        action: params.action,
        entity: params.entity,
        actor: params.actor,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  // Run asynchronously — does not block the caller
  void attempt(1);
}
