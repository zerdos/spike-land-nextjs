import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AgentStage } from "@/components/my-apps/AgentProgressIndicator";
import type { AppData, AppMessage, PageMode } from "@/lib/apps/types";
import {
  getSessionCache,
  invalidateSessionCache,
  setSessionCache,
} from "@/lib/apps/session-cache";
import { parseAgentStreamLine } from "@/lib/apps/agent-stream";
import { useAppMessages } from "./useAppMessages";
import { useAppSSE } from "./useAppSSE";
import { useFileAttachments } from "./useFileAttachments";

export function useAppWorkspace(
  codeSpace: string,
  router: { push: (url: string) => void },
) {
  // Page state
  const [mode, setMode] = useState<PageMode>("loading");
  const [, setHasContent] = useState(false);
  const [app, setApp] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Agent state
  const [agentWorking, setAgentWorking] = useState(false);
  const [, setIframeKey] = useState(0);
  const [streamingResponse, setStreamingResponse] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFlashKey, setSyncFlashKey] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [movingToBin, setMovingToBin] = useState(false);

  // Agent progress state
  const [agentStage, setAgentStage] = useState<AgentStage | null>(null);
  const [currentTool, setCurrentTool] = useState<string | undefined>();
  const [agentStartTime, setAgentStartTime] = useState<number | undefined>();
  const [agentError, setAgentError] = useState<string | undefined>();

  // Preview modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewModalUrl, setPreviewModalUrl] = useState<string>("");
  const [previewModalVersion, setPreviewModalVersion] = useState<
    string | undefined
  >();

  const abortControllerRef = useRef<AbortController | null>(null);

  // Hooks
  const {
    messages,
    setMessages,
    messagesRef,
    fetchMessages,
    fetchMessagesWithRetry,
    clearMessages,
    clearingChat,
  } = useAppMessages(app?.id);

  const attachments = useFileAttachments(app?.id);

  // Version map for O(1) lookups
  const versionMap = useMemo(() => {
    const agentMessagesWithCode = messages.filter(
      (m) => m.role === "AGENT" && m.codeVersion,
    );
    return new Map(agentMessagesWithCode.map((m, i) => [m.id, i + 1]));
  }, [messages]);

  const totalVersions = versionMap.size;

  // SSE callbacks (stable refs to avoid unnecessary reconnects)
  const sseCallbacksRef = useRef({
    onMessage: (msg: AppMessage) => {
      setMessages((prev: AppMessage[]) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (msg.role === "AGENT") {
        setIframeKey((prev) => prev + 1);
        setHasContent(true);
      }
    },
    onStatus: (status: string) => {
      setApp((prev) => (prev ? { ...prev, status: status as AppData["status"] } : null));
      invalidateSessionCache(codeSpace);
    },
    onAgentWorking: (isWorking: boolean) => {
      setAgentWorking(isWorking);
      invalidateSessionCache(codeSpace);
    },
    onCodeUpdated: () => {
      setIframeKey((prev) => prev + 1);
      setHasContent(true);
      setTimeout(() => setIsSyncing(false), 500);
      invalidateSessionCache(codeSpace);
    },
    onSyncInProgress: (syncing: boolean) => {
      setIsSyncing(syncing);
      if (syncing) setSyncFlashKey((prev) => prev + 1);
    },
  });

  useAppSSE(app?.id, mode === "workspace", sseCallbacksRef.current);

  // Validate codespace & backward compat
  useEffect(() => {
    if (/^c[a-z0-9]{20,}$/i.test(codeSpace)) {
      fetch(`/api/apps/${codeSpace}`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Not found");
        })
        .then((appData) => {
          if (appData.codespaceId && appData.codespaceId !== codeSpace) {
            router.push(`/my-apps/${appData.codespaceId}`);
          }
        })
        .catch(() => {});
    }
  }, [codeSpace, router]);

  // Initial load
  useEffect(() => {
    async function checkCodeSpace() {
      try {
        if (typeof window !== "undefined") {
          const cached = getSessionCache(codeSpace);
          if (cached) {
            if (cached.app) {
              setApp(cached.app);
              setAgentWorking(cached.app.agentWorking || false);
              setHasContent(cached.hasContent || false);
              setMode("workspace");
              return;
            } else if (cached.isPromptMode) {
              setMode("prompt");
              return;
            }
          }
        }

        const response = await fetch(
          `/api/apps/by-codespace/${encodeURIComponent(codeSpace)}`,
        );

        if (response.status === 401) {
          router.push(
            `/auth/signin?callbackUrl=${encodeURIComponent(`/my-apps/${codeSpace}`)}`,
          );
          return;
        }

        if (!response.ok) {
          setError(
            response.status === 400
              ? "Invalid codespace name"
              : "Failed to load codespace",
          );
          setMode("prompt");
          return;
        }

        const data = await response.json();
        setHasContent(data.hasContent || false);

        if (data.app) {
          setApp(data.app);
          setAgentWorking(data.app.agentWorking || false);
          setMode("workspace");
          setSessionCache(codeSpace, {
            app: data.app,
            hasContent: data.hasContent,
          });
        } else {
          setMode("prompt");
          setSessionCache(codeSpace, { isPromptMode: true });
        }
      } catch (err) {
        console.error(
          "[MyApps] Failed to load codespace:",
          err instanceof Error ? err.message : String(err),
        );
        setError("Failed to load codespace");
        setMode("prompt");
      }
    }

    checkCodeSpace();
  }, [codeSpace, router]);

  // Fetch messages when entering workspace mode
  useEffect(() => {
    if (mode === "workspace" && app?.id) {
      fetchMessages();
    }
  }, [mode, app?.id, fetchMessages]);

  // Process message with agent (streaming)
  const processMessageWithAgent = useCallback(
    async (appId: string, content: string, imageIds: string[] = []) => {
      setIsStreaming(true);
      setStreamingResponse("");
      setAgentStage("initialize");
      setAgentStartTime(Date.now());
      setCurrentTool(undefined);
      setAgentError(undefined);

      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      try {
        const response = await fetch(`/api/apps/${appId}/agent/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: content || "[Image attached]",
            imageIds,
          }),
          signal,
        });

        if (!response.ok) throw new Error("Failed to send message to agent");

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error("No reader available");

        let buffer = "";
        let receivedChunks = false;
        let isQueueMode = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const event = parseAgentStreamLine(line);
            if (!event) continue;

            if (event.type === "chunk") {
              receivedChunks = true;
              setStreamingResponse((prev) => prev + (event.content || ""));
            } else if (event.type === "stage") {
              setAgentStage(event.stage as AgentStage);
              if (event.tool) setCurrentTool(event.tool);
            } else if (
              event.type === "status" &&
              event.content?.includes("queued")
            ) {
              isQueueMode = true;
            } else if (event.type === "error") {
              setAgentStage("error");
              setAgentError(event.content);
            }
          }
        }

        if (isQueueMode && !receivedChunks) {
          setAgentStage("processing");
          const maxPollTime = 120000;
          const startTime = Date.now();
          let pollInterval = 2000;

          while (Date.now() - startTime < maxPollTime) {
            await new Promise((r) => setTimeout(r, pollInterval));
            const messagesRes = await fetch(`/api/apps/${appId}/messages`);
            if (messagesRes.ok) {
              const data = await messagesRes.json();
              const msgs = (data.messages || []).reverse();
              const hasAgentResponse = msgs.some(
                (m: { role: string; id: string }) =>
                  m.role === "AGENT" &&
                  !messagesRef.current.some(
                    (existing) => existing.id === m.id,
                  ),
              );
              if (hasAgentResponse) {
                setMessages(msgs);
                setAgentStage("complete");
                setIframeKey((prev) => prev + 1);
                setHasContent(true);
                break;
              }
            }
            pollInterval = Math.min(pollInterval * 1.5, 5000);
          }
        } else {
          await fetchMessages();
          setIframeKey((prev) => prev + 1);
          setHasContent(true);
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
          setAgentStage(null);
          setAgentError(undefined);
        } else {
          console.error("Failed to process message with agent", e);
          setAgentStage("error");
          setAgentError(e instanceof Error ? e.message : "Unknown error");
        }
      } finally {
        abortControllerRef.current = null;
        setIsStreaming(false);
        setStreamingResponse("");
        const displayMs = agentError ? 10000 : 1500;
        setTimeout(() => {
          setAgentStage(null);
          setAgentStartTime(undefined);
          setCurrentTool(undefined);
          setAgentError(undefined);
        }, displayMs);
      }
    },
    [fetchMessages, agentError, messagesRef, setMessages],
  );

  // Create app from prompt
  const handleCreateApp = useCallback(
    async (
      content: string,
      templateId: string | null,
      pendingFiles: Array<{ file: File }>,
    ) => {
      if ((!content.trim() && pendingFiles.length === 0) || sendingMessage)
        return;

      setSendingMessage(true);
      try {
        const formData = new FormData();
        formData.append("prompt", content.trim() || "[Files attached]");
        formData.append("codespaceId", codeSpace);
        if (templateId) formData.append("templateId", templateId);
        pendingFiles.forEach((pf) => formData.append("files", pf.file));

        const response = await fetch("/api/apps", {
          method: "POST",
          body:
            pendingFiles.length > 0
              ? formData
              : JSON.stringify({
                  prompt: content.trim(),
                  codespaceId: codeSpace,
                  ...(templateId && { templateId }),
                }),
          headers:
            pendingFiles.length > 0
              ? undefined
              : { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to create app");
        }

        const newApp = await response.json();
        setApp(newApp);
        setMode("workspace");

        const fetchedMessages = await fetchMessagesWithRetry(newApp.id);
        setMessages(fetchedMessages);
        await processMessageWithAgent(
          newApp.id,
          content.trim() || "[Files attached]",
        );
      } catch (e) {
        console.error("Failed to create app", e);
        throw e;
      } finally {
        setSendingMessage(false);
      }
    },
    [
      codeSpace,
      sendingMessage,
      fetchMessagesWithRetry,
      processMessageWithAgent,
      setMessages,
    ],
  );

  // Send message in workspace mode
  const handleSendMessage = useCallback(
    async (content: string, imageIds: string[]) => {
      if (
        (!content.trim() && imageIds.length === 0) ||
        sendingMessage ||
        isStreaming
      )
        return;
      if (!app?.id) return;

      setSendingMessage(true);
      try {
        // Optimistic add
        const optimId = `temp-${Date.now()}`;
        setMessages((prev: AppMessage[]) => [
          ...prev,
          {
            id: optimId,
            role: "USER" as const,
            content: content || "[Image attached]",
            createdAt: new Date().toISOString(),
          },
        ]);

        await processMessageWithAgent(app.id, content, imageIds);
      } catch (e) {
        console.error("Failed to send message", e);
        setAgentStage("error");
        setAgentError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setSendingMessage(false);
      }
    },
    [app?.id, sendingMessage, isStreaming, processMessageWithAgent, setMessages],
  );

  // Move to bin
  const handleMoveToBin = useCallback(async () => {
    if (movingToBin || !app?.id) return;
    setMovingToBin(true);
    try {
      const appIdentifier = app.codespaceId || codeSpace;
      const response = await fetch(`/api/apps/${appIdentifier}/bin`, {
        method: "POST",
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to move to bin");
      }
      return app.name;
    } catch (e) {
      throw e;
    } finally {
      setMovingToBin(false);
    }
  }, [app, codeSpace, movingToBin]);

  // Cancel agent processing
  const handleCancelAgent = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Open preview modal
  const handleOpenPreview = useCallback(
    (url: string, versionLabel?: string) => {
      setPreviewModalUrl(url);
      setPreviewModalVersion(versionLabel);
      setPreviewModalOpen(true);
    },
    [],
  );

  const refreshIframe = useCallback(() => {
    setIframeKey((prev) => prev + 1);
    fetchMessages();
  }, [fetchMessages]);

  return {
    // Page state
    mode,
    app,
    error,

    // Messages
    messages,
    clearMessages,
    clearingChat,

    // Agent state
    agentWorking,
    streamingResponse,
    isSyncing,
    syncFlashKey,
    isStreaming,
    sendingMessage,
    movingToBin,

    // Agent progress
    agentStage,
    currentTool,
    agentStartTime,
    agentError,

    // Preview
    previewModalOpen,
    setPreviewModalOpen,
    previewModalUrl,
    previewModalVersion,

    // Version map
    versionMap,
    totalVersions,

    // Attachments
    ...attachments,

    // Actions
    handleCreateApp,
    handleSendMessage,
    handleMoveToBin,
    handleCancelAgent,
    handleOpenPreview,
    refreshIframe,
  };
}
