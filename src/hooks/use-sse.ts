"use client";

import { useEffect, useRef, useCallback } from "react";

type SSEHandler = (data: unknown) => void;

export function useSSE(handlers: Record<string, SSEHandler>) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const connect = useCallback(() => {
    const es = new EventSource("/api/sse/events");

    // Use generic onmessage as fallback won't work for named events.
    // Instead, register a broad set of known event types and delegate
    // to handlersRef at dispatch time (not registration time).
    const knownEvents = [
      "notification",
      "task-run-update",
      "alert",
      "tenant-update",
      "bookmark-update",
      "custom-field-update",
      "security-snapshot",
      "license-update",
    ];

    for (const eventType of knownEvents) {
      es.addEventListener(eventType, (e: MessageEvent) => {
        const handler = handlersRef.current[eventType];
        if (!handler) return;
        try {
          const data = JSON.parse(e.data);
          handler(data);
        } catch {
          // Malformed data, ignore
        }
      });
    }

    es.onerror = () => {
      es.close();
      // Auto-reconnect after 5s
      setTimeout(connect, 5000);
    };

    return es;
  }, []);

  useEffect(() => {
    const es = connect();
    return () => es.close();
  }, [connect]);
}
