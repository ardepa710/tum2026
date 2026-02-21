"use client";

import { useEffect, useRef, useCallback } from "react";

type SSEHandler = (data: unknown) => void;

export function useSSE(handlers: Record<string, SSEHandler>) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const connect = useCallback(() => {
    const es = new EventSource("/api/sse/events");

    for (const eventType of Object.keys(handlersRef.current)) {
      es.addEventListener(eventType, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          handlersRef.current[eventType]?.(data);
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
