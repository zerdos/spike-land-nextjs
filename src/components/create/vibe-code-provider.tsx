"use client";

import type { AgentStage } from "@/components/my-apps/AgentProgressIndicator";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { signIn, useSession } from "next-auth/react";

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
  clearMessages: () => void;
}

export const VibeCodeContext = createContext<VibeCodeContextValue | null>(null);

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

const MAX_PERSISTED_MESSAGES = 50;
const BASE64_DATA_PATTERN = /^data:[^;]+;base64,.+/;

function getSessionStorageKey(slug: string): string {
  return `vibe-messages-${slug}`;
}

function stripBase64Images(messages: VibeMessage[]): VibeMessage[] {
  return messages.map((msg) => {
    if (!msg.images || msg.images.length === 0) return msg;
    return {
      ...msg,
      images: msg.images.map((img) =>
        BASE64_DATA_PATTERN.test(img) ? "[image]" : img
      ),
    };
  });
}

function loadMessagesFromStorage(slug: string): VibeMessage[] | null {
  try {
    const raw = sessionStorage.getItem(getSessionStorageKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as VibeMessage[];
    return null;
  } catch {
    return null;
  }
}

function saveMessagesToStorage(slug: string, messages: VibeMessage[]): void {
  try {
    const capped = messages.slice(-MAX_PERSISTED_MESSAGES);
    const stripped = stripBase64Images(capped);
    sessionStorage.setItem(
      getSessionStorageKey(slug),
      JSON.stringify(stripped),
    );
  } catch {
    // sessionStorage may be full or unavailable — silently ignore
  }
}

function clearMessagesFromStorage(slug: string): void {
  try {
    sessionStorage.removeItem(getSessionStorageKey(slug));
  } catch {
    // silently ignore
  }
}

export function VibeCodeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
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
    const saved = loadMessagesFromStorage(ctx.slug);
    if (saved && saved.length > 0) {
      setMessages(saved);
    }
  }, []);

  // Persist messages to sessionStorage whenever they change
  useEffect(() => {
    if (!appContext) return;
    if (messages.length === 0) return;
    saveMessagesToStorage(appContext.slug, messages);
  }, [messages, appContext]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    const ctx = appContextRef.current;
    if (ctx) {
      clearMessagesFromStorage(ctx.slug);
    }
  }, []);

  const sendMessage = useCallback(
    async (
      content: string,
      images?: File[],
      autoScreenshot?: boolean,
    ) => {
      // Check auth first
      if (!session) {
        signIn();
        return;
      }

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

        if (res.status === 401) {
          signIn();
          throw new Error("Unauthorized");
        }

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
                  agentContent += `\n\nError: ${event.content || event.message || "Unknown error"}`;
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
    [mode, session],
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
      clearMessages,
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
      clearMessages,
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
