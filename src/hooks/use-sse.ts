"use client";

import { useEffect, useRef } from "react";

type SSEHandler = (data: unknown) => void;

export function useSSE(handlers: Record<string, SSEHandler>) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = 5000; // Start at 5s, max 60s
    let cancelled = false;

    function connect() {
      if (cancelled) return;

      es = new EventSource("/api/sse/events");

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

      // Reset backoff on successful connection
      es.addEventListener("open", () => {
        retryDelay = 5000;
      });

      es.onerror = () => {
        if (es) {
          es.close();
          es = null;
        }
        if (cancelled) return;
        // Exponential backoff: 5s → 10s → 20s → 40s → 60s (cap)
        retryTimeout = setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 60000);
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (es) {
        es.close();
        es = null;
      }
    };
  }, []);
}
