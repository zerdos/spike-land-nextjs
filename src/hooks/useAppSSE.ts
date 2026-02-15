import { useEffect, useRef } from "react";
import { parseSSEEvent } from "@/lib/apps/sse-parser";
import type { AppMessage } from "@/lib/apps/types";

export interface AppSSECallbacks {
  onMessage: (msg: AppMessage) => void;
  onStatus: (status: string) => void;
  onAgentWorking: (isWorking: boolean) => void;
  onCodeUpdated: () => void;
  onSyncInProgress: (isSyncing: boolean) => void;
}

export function useAppSSE(
  appId: string | undefined,
  isActive: boolean,
  callbacks: AppSSECallbacks,
) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    if (!isActive || !appId) return;

    const eventSource = new EventSource(`/api/apps/${appId}/messages/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const parsed = parseSSEEvent(event.data);
      if (!parsed) return;

      const cb = callbacksRef.current;
      switch (parsed.type) {
        case "message":
          cb.onMessage(parsed.data as unknown as AppMessage);
          break;
        case "status":
          cb.onStatus(parsed.data["status"] as string);
          break;
        case "agent_working":
          cb.onAgentWorking(parsed.data["isWorking"] as boolean);
          break;
        case "code_updated":
          cb.onCodeUpdated();
          break;
        case "sync_in_progress":
          cb.onSyncInProgress(parsed.data["isSyncing"] as boolean);
          break;
      }
    };

    eventSource.onerror = () => {
      console.error("SSE connection error");
      eventSource.close();
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [appId, isActive]);

  return eventSourceRef;
}
