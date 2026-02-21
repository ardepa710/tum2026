// In-memory SSE event bus.
// On Vercel Serverless: each invocation is isolated, so events only
// reach clients on the same instance. SSE auto-reconnects, and
// client re-fetches state on reconnection. Acceptable trade-off.

type SSEListener = (event: string, data: string) => void;

const listeners = new Map<string, Set<SSEListener>>();

export function addListener(userId: string, listener: SSEListener) {
  if (!listeners.has(userId)) listeners.set(userId, new Set());
  listeners.get(userId)!.add(listener);
}

export function removeListener(userId: string, listener: SSEListener) {
  listeners.get(userId)?.delete(listener);
  if (listeners.get(userId)?.size === 0) listeners.delete(userId);
}

export function emitEvent(userId: string, eventType: string, payload: unknown) {
  const userListeners = listeners.get(userId);
  if (!userListeners) return;
  const data = JSON.stringify(payload);
  for (const listener of userListeners) {
    try {
      listener(eventType, data);
    } catch {
      // Listener may have been closed
    }
  }
}

export function broadcastEvent(eventType: string, payload: unknown) {
  const data = JSON.stringify(payload);
  for (const userListeners of listeners.values()) {
    for (const listener of userListeners) {
      try {
        listener(eventType, data);
      } catch {
        // Listener may have been closed
      }
    }
  }
}
