"use client";

import type { AgentStage } from "@/components/my-apps/AgentProgressIndicator";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

export interface VibeMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  images?: string[];
  timestamp: number;
}

interface AppContext {
  slug: string;
  title: string;
  codespaceId: string;
}

interface VibeCodeContextValue {
  isOpen: boolean;
  mode: "plan" | "edit";
  messages: VibeMessage[];
  appContext: AppContext | null;
  agentStage: AgentStage | null;
  isStreaming: boolean;
  refreshCounter: number;
  openPanel: () => void;
  closePanel: () => void;
  setMode: (mode: "plan" | "edit") => void;
  sendMessage: (
    content: string,
    images?: File[],
    autoScreenshot?: boolean,
  ) => Promise<void>;
  setAppContext: (ctx: AppContext) => void;
}

const VibeCodeContext = createContext<VibeCodeContextValue | null>(null);

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function VibeCodeProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"plan" | "edit">("plan");
  const [messages, setMessages] = useState<VibeMessage[]>([]);
  const [appContext, setAppContext] = useState<AppContext | null>(null);
  const [agentStage, setAgentStage] = useState<AgentStage | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const appContextRef = useRef(appContext);
  appContextRef.current = appContext;

  const openPanel = useCallback(() => setIsOpen(true), []);
  const closePanel = useCallback(() => setIsOpen(false), []);

  const setAppContextStable = useCallback((ctx: AppContext) => {
    setAppContext(ctx);
  }, []);

  const sendMessage = useCallback(
    async (
      content: string,
      images?: File[],
      autoScreenshot?: boolean,
    ) => {
      const ctx = appContextRef.current;
      if (!ctx) return;

      // Convert images to base64
      const base64Images: string[] = [];
      if (images && images.length > 0) {
        for (const file of images) {
          const b64 = await fileToBase64(file);
          base64Images.push(b64);
        }
      }

      // Fetch screenshot if requested
      let screenshotBase64: string | undefined;
      if (autoScreenshot) {
        try {
          const res = await fetch(
            `/api/create/screenshot?slug=${encodeURIComponent(ctx.slug)}`,
          );
          if (res.ok) {
            const data = await res.json();
            screenshotBase64 = data.base64;
          }
        } catch {
          // Screenshot fetch failed — continue without it
        }
      }

      // Add user message
      const userMessage: VibeMessage = {
        id: generateId(),
        role: "user",
        content,
        images:
          base64Images.length > 0
            ? base64Images
            : screenshotBase64
              ? [screenshotBase64]
              : undefined,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Start streaming
      setIsStreaming(true);
      setAgentStage("initialize");

      const agentMessageId = generateId();
      let agentContent = "";

      // Add empty agent message placeholder
      setMessages((prev) => [
        ...prev,
        {
          id: agentMessageId,
          role: "agent",
          content: "",
          timestamp: Date.now(),
        },
      ]);

      try {
        const res = await fetch(`/api/create/vibe-chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: ctx.slug,
            content,
            mode,
            images: base64Images.length > 0 ? base64Images : undefined,
            screenshotBase64,
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error(
            `Request failed: ${res.status} ${res.statusText}`,
          );
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (!data) continue;

            try {
              const event = JSON.parse(data);
              switch (event.type) {
                case "stage":
                  setAgentStage(event.stage);
                  break;
                case "chunk":
                  agentContent += event.content;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === agentMessageId
                        ? { ...m, content: agentContent }
                        : m
                    )
                  );
                  break;
                case "code_updated":
                  setRefreshCounter((c) => c + 1);
                  break;
                case "error":
                  agentContent += `\n\nError: ${event.message}`;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === agentMessageId
                        ? { ...m, content: agentContent }
                        : m
                    )
                  );
                  break;
                case "complete":
                  setIsStreaming(false);
                  setAgentStage(null);
                  break;
              }
            } catch {
              // skip unparseable lines
            }
          }
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Unknown error";
        agentContent += `\n\nError: ${errorMsg}`;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentMessageId
              ? { ...m, content: agentContent }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
        setAgentStage(null);
      }
    },
    [mode],
  );

  const value = useMemo<VibeCodeContextValue>(
    () => ({
      isOpen,
      mode,
      messages,
      appContext,
      agentStage,
      isStreaming,
      refreshCounter,
      openPanel,
      closePanel,
      setMode,
      sendMessage,
      setAppContext: setAppContextStable,
    }),
    [
      isOpen,
      mode,
      messages,
      appContext,
      agentStage,
      isStreaming,
      refreshCounter,
      openPanel,
      closePanel,
      sendMessage,
      setAppContextStable,
    ],
  );

  return (
    <VibeCodeContext.Provider value={value}>
      {children}
    </VibeCodeContext.Provider>
  );
}

export function useVibeCode(): VibeCodeContextValue {
  const ctx = useContext(VibeCodeContext);
  if (!ctx) {
    throw new Error("useVibeCode must be used within a VibeCodeProvider");
  }
  return ctx;
}
