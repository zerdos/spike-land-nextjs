"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentChatMessage } from "../types";

export function useAgentChat(agentId: string | null) {
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (!agentId || eventSourceRef.current) return;

    const es = new EventSource(`/api/admin/agents/${agentId}/chat`);

    es.onopen = () => setConnected(true);

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as AgentChatMessage;
        setMessages((prev) => [...prev, msg]);
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
  }, [agentId]);

  useEffect(() => {
    setMessages([]);
    connect();
    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      setConnected(false);
    };
  }, [connect]);

  const sendMessage = useCallback(
    async (_agentId: string, content: string) => {
      if (!agentId) return;

      const optimisticMsg: AgentChatMessage = {
        id: crypto.randomUUID(),
        agentId,
        role: "user",
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      await fetch(`/api/admin/agents/${agentId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
    },
    [agentId],
  );

  return { messages, connected, sendMessage };
}
