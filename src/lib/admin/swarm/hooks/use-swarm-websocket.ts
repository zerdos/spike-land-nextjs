"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SSEEvent, SSEEventType } from "../types";

type EventHandler = (event: SSEEvent) => void;

interface UseSwarmWebSocketReturn {
  connected: boolean;
  subscribe: (eventType: SSEEventType, handler: EventHandler) => () => void;
}

/**
 * Multiplexed SSE connection manager. Maintains a single SSE connection
 * and dispatches events to subscribers by event type.
 */
export function useSwarmWebSocket(): UseSwarmWebSocketReturn {
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const subscribersRef = useRef<Map<SSEEventType, Set<EventHandler>>>(new Map());

  const dispatch = useCallback((event: SSEEvent) => {
    const handlers = subscribersRef.current.get(event.type);
    if (handlers) {
      handlers.forEach((handler) => handler(event));
    }
  }, []);

  const connect = useCallback(() => {
    if (eventSourceRef.current) return;

    const es = new EventSource("/api/admin/stream");

    es.onopen = () => setConnected(true);

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as SSEEvent;
        dispatch(event);
      } catch {
        // Ignore malformed events
      }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      eventSourceRef.current = null;
      setTimeout(connect, 5000);
    };

    eventSourceRef.current = es;
  }, [dispatch]);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [connect]);

  const subscribe = useCallback(
    (eventType: SSEEventType, handler: EventHandler): (() => void) => {
      if (!subscribersRef.current.has(eventType)) {
        subscribersRef.current.set(eventType, new Set());
      }
      subscribersRef.current.get(eventType)!.add(handler);

      return () => {
        subscribersRef.current.get(eventType)?.delete(handler);
      };
    },
    [],
  );

  return { connected, subscribe };
}
