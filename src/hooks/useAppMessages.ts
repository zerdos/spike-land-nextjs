import { useCallback, useRef, useState } from "react";
import type { AppMessage } from "@/lib/apps/types";

export function useAppMessages(appId: string | undefined) {
  const [messages, setMessages] = useState<AppMessage[]>([]);
  const [clearingChat, setClearingChat] = useState(false);
  const messagesRef = useRef<AppMessage[]>(messages);

  // Keep ref in sync to prevent stale closures
  messagesRef.current = messages;

  const fetchMessages = useCallback(async () => {
    if (!appId) return;
    try {
      const response = await fetch(`/api/apps/${appId}/messages`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      const data = await response.json();
      setMessages((data.messages || []).reverse());
    } catch (error) {
      console.error(
        "[MyApps] Failed to load messages:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }, [appId]);

  const fetchMessagesWithRetry = useCallback(
    async (targetAppId: string, retries = 3): Promise<AppMessage[]> => {
      for (let i = 0; i < retries; i++) {
        if (i > 0) {
          await new Promise((r) => setTimeout(r, 500 * Math.pow(2, i - 1)));
        }
        try {
          const response = await fetch(`/api/apps/${targetAppId}/messages`);
          if (response.ok) {
            const data = await response.json();
            return (data.messages || []).reverse();
          }
        } catch (error) {
          console.error(
            `[MyApps] Retry ${i + 1}/${retries} failed for messages fetch:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }
      return [];
    },
    [],
  );

  const clearMessages = useCallback(async () => {
    if (clearingChat || !appId) return;
    setClearingChat(true);
    try {
      const response = await fetch(`/api/apps/${appId}/messages`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to clear chat");
      setMessages([]);
    } catch (error) {
      console.error(
        "[MyApps] Failed to clear chat:",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setClearingChat(false);
    }
  }, [appId, clearingChat]);

  return {
    messages,
    setMessages,
    messagesRef,
    fetchMessages,
    fetchMessagesWithRetry,
    clearMessages,
    clearingChat,
  };
}
