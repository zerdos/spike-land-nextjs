"use client";

import {
  AgentProgressIndicator,
  type AgentStage,
} from "@/components/my-apps/AgentProgressIndicator";
import { ChatMessagePreview } from "@/components/my-apps/ChatMessagePreview";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { APP_BUILD_STATUSES } from "@/lib/validations/app";
import { motion } from "framer-motion";
import { FileText, ImagePlus, Paperclip, StopCircle, X } from "lucide-react";
import { useTransitionRouter as useRouter } from "next-view-transitions";
import Image from "next/image";
import { redirect, useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

// Types
interface AppMessage {
  id: string;
  role: "USER" | "AGENT" | "SYSTEM";
  content: string;
  createdAt: string;
  attachments?: Array<{
    image: {
      id: string;
      originalUrl: string;
    };
  }>;
  // Version associated with this message (for AGENT messages)
  codeVersion?: {
    id: string;
    createdAt: string;
  };
}

interface AppData {
  id: string;
  name: string;
  description: string | null;
  status: (typeof APP_BUILD_STATUSES)[number];
  codespaceId: string | null;
  codespaceUrl: string | null;
  isPublic: boolean;
  isCurated: boolean;
  lastAgentActivity: string | null;
  agentWorking: boolean;
  createdAt: string;
  updatedAt: string;
  requirements: Array<{ id: string; content: string; }>;
  monetizationModels: Array<{ id: string; model: string; }>;
  statusHistory: Array<{
    id: string;
    status: string;
    message: string | null;
    createdAt: string;
  }>;
  _count: {
    messages: number;
    images: number;
  };
}

interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
}

interface PendingFile {
  id: string;
  file: File;
}

type PageMode = "loading" | "prompt" | "workspace";

// Helper functions
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Markdown components for chat rendering
const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children }) => (
    <code className="bg-white/10 text-teal-300 px-1.5 py-0.5 rounded text-sm font-mono">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="bg-black/30 border border-white/10 rounded-lg p-3 overflow-x-auto my-2 text-sm">
      {children}
    </pre>
  ),
  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-teal-400 hover:text-teal-300 underline"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-teal-500/50 pl-3 my-2 text-zinc-300 italic">
      {children}
    </blockquote>
  ),
  h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
};

function MarkdownContent({ content }: { content: string; }) {
  return <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>;
}

// Preview placeholder component (when no content)
function PreviewPlaceholder() {
  return (
    <div className="flex h-full items-center justify-center text-center text-zinc-500">
      <div className="space-y-4">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-zinc-600 mb-2 shadow-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </div>
        <div>
          <p className="text-zinc-400 font-medium">Preview will appear here</p>
          <p className="text-sm opacity-50 mt-1">
            Start chatting to generate your app
          </p>
        </div>
      </div>
    </div>
  );
}

// Browser toolbar component
function BrowserToolbar({
  url,
  onRefresh,
}: {
  url: string;
  onRefresh: () => void;
}) {
  return (
    <div className="flex items-center gap-4 border-b border-white/5 bg-white/[0.02] px-5 py-4 relative z-10 overflow-hidden">
      <div className="flex gap-2 shrink-0">
        <div className="h-3 w-3 rounded-full bg-[#FF5F56] border border-white/5 shadow-inner" />
        <div className="h-3 w-3 rounded-full bg-[#FFBD2E] border border-white/5 shadow-inner" />
        <div className="h-3 w-3 rounded-full bg-[#27C93F] border border-white/5 shadow-inner" />
      </div>

      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="bg-black/20 rounded-lg border border-white/5 py-1.5 px-3 flex items-center overflow-hidden">
          <div
            data-testid="address-bar"
            className="text-[11px] text-zinc-400 truncate font-mono w-full"
            style={{ direction: "rtl", textAlign: "left" }}
          >
            {url}
          </div>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full transition-colors shrink-0"
        onClick={onRefresh}
        title="Refresh Preview"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12" />
          <path d="M3 3v9h9" />
        </svg>
      </Button>
    </div>
  );
}

// Main page component
export default function CodeSpacePage() {
  const router = useRouter();
  const params = useParams();
  const codeSpace = params["codeSpace"] as string;

  // Page state
  const [mode, setMode] = useState<PageMode>("loading");
  const [hasContent, setHasContent] = useState(false);
  const [app, setApp] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Workspace state
  const [messages, setMessages] = useState<AppMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [agentWorking, setAgentWorking] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);

  // Agent progress state
  const [agentStage, setAgentStage] = useState<AgentStage | null>(null);
  const [currentTool, setCurrentTool] = useState<string | undefined>();
  const [agentStartTime, setAgentStartTime] = useState<number | undefined>();
  const [agentError, setAgentError] = useState<string | undefined>();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const codespaceUrl = `https://testing.spike.land/live/${codeSpace}/`;

  // Validate codespace name and check for backward compatibility
  useEffect(() => {
    // Check if this looks like a cuid (backward compatibility)
    if (/^c[a-z0-9]{20,}$/i.test(codeSpace)) {
      // This might be an old URL format - try to find the app by ID
      fetch(`/api/apps/${codeSpace}`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Not found");
        })
        .then((appData) => {
          // If app has codespaceId, redirect to the new URL format
          if (appData.codespaceId && appData.codespaceId !== codeSpace) {
            redirect(`/my-apps/${appData.codespaceId}`);
          }
        })
        .catch(() => {
          // Not found by ID, continue with normal flow
        });
    }
  }, [codeSpace]);

  // Initial load - check if app exists
  useEffect(() => {
    async function checkCodeSpace() {
      try {
        const response = await fetch(
          `/api/apps/by-codespace/${encodeURIComponent(codeSpace)}`,
        );

        if (response.status === 401) {
          // Not authenticated - redirect to sign in
          router.push(
            `/auth/signin?callbackUrl=${encodeURIComponent(`/my-apps/${codeSpace}`)}`,
          );
          return;
        }

        if (!response.ok) {
          if (response.status === 400) {
            setError("Invalid codespace name");
          } else {
            setError("Failed to load codespace");
          }
          setMode("prompt");
          return;
        }

        const data = await response.json();
        setHasContent(data.hasContent || false);

        if (data.app) {
          // App exists - show workspace
          setApp(data.app);
          setAgentWorking(data.app.agentWorking || false);
          setMode("workspace");
        } else {
          // No app yet - show prompt form
          setMode("prompt");
        }
      } catch {
        setError("Failed to load codespace");
        setMode("prompt");
      }
    }

    checkCodeSpace();
  }, [codeSpace, router]);

  // Fetch messages when in workspace mode
  const fetchMessages = useCallback(async () => {
    if (!app?.id) return;

    try {
      const response = await fetch(`/api/apps/${app.id}/messages`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      const data = await response.json();
      setMessages((data.messages || []).reverse());
    } catch {
      console.error("Failed to load messages");
    }
  }, [app?.id]);

  useEffect(() => {
    if (mode === "workspace" && app?.id) {
      fetchMessages();
    }
  }, [mode, app?.id, fetchMessages]);

  // Set up SSE connection for workspace mode
  useEffect(() => {
    if (mode !== "workspace" || !app?.id) return;

    const eventSource = new EventSource(`/api/apps/${app.id}/messages/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "message":
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.data.id)) return prev;
              return [...prev, data.data];
            });
            if (data.data.role === "AGENT") {
              setIframeKey((prev) => prev + 1);
              setHasContent(true);
            }
            break;

          case "status":
            setApp((
              prev,
            ) => (prev ? { ...prev, status: data.data.status } : null));
            break;

          case "agent_working":
            setAgentWorking(data.data.isWorking);
            break;

          case "code_updated":
            setIframeKey((prev) => prev + 1);
            setHasContent(true);
            break;
        }
      } catch {
        console.error("Failed to parse SSE event");
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
  }, [mode, app?.id]);

  // Debounced scroll to bottom for performance
  const scrollToBottom = useMemo(
    () => {
      let timeout: NodeJS.Timeout | null = null;
      return () => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      };
    },
    [],
  );

  // Scroll to bottom when messages change (debounced)
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingResponse, scrollToBottom]);

  // File handling for prompt mode
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: PendingFile[] = [];
    for (let i = 0; i < Math.min(files.length, 10); i++) {
      const file = files[i];
      if (file && !file.type.startsWith("image/")) {
        newFiles.push({
          id: `pending-${Date.now()}-${i}`,
          file,
        });
      }
    }
    setPendingFiles((prev) => [...prev, ...newFiles].slice(0, 10));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Image handling for workspace mode
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: PendingImage[] = [];
    for (let i = 0; i < Math.min(files.length, 5); i++) {
      const file = files[i];
      if (file && file.type.startsWith("image/")) {
        newImages.push({
          id: `pending-${Date.now()}-${i}`,
          file,
          previewUrl: URL.createObjectURL(file),
        });
      }
    }
    setPendingImages((prev) => [...prev, ...newImages].slice(0, 5));
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (id: string) => {
    setPendingImages((prev) => {
      const image = prev.find((img) => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }
      return prev.filter((img) => img.id !== id);
    });
  };

  const uploadImages = async (): Promise<string[]> => {
    if (pendingImages.length === 0 || !app?.id) return [];

    setUploadingImages(true);
    try {
      const formData = new FormData();
      pendingImages.forEach((img) => {
        formData.append("images", img.file);
      });

      const response = await fetch(`/api/apps/${app.id}/images`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload images");

      const data = await response.json();
      return data.images.map((img: { id: string; }) => img.id);
    } finally {
      setUploadingImages(false);
      pendingImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      setPendingImages([]);
    }
  };

  // Retry logic for fetching messages with exponential backoff
  const fetchMessagesWithRetry = useCallback(
    async (appId: string, retries = 3): Promise<AppMessage[]> => {
      for (let i = 0; i < retries; i++) {
        // Only delay between retries, not before first attempt
        if (i > 0) {
          await new Promise((r) => setTimeout(r, 500 * Math.pow(2, i - 1)));
        }
        try {
          const response = await fetch(`/api/apps/${appId}/messages`);
          if (response.ok) {
            const data = await response.json();
            return (data.messages || []).reverse();
          }
        } catch {
          console.error(`Retry ${i + 1}/${retries} failed for messages fetch`);
        }
      }
      return [];
    },
    [],
  );

  // Shared helper to process a message with the agent (streaming)
  const processMessageWithAgent = useCallback(
    async (appId: string, content: string, imageIds: string[] = []) => {
      setIsStreaming(true);
      setStreamingResponse("");

      // Initialize agent progress tracking
      setAgentStage("connecting");
      setAgentStartTime(Date.now());
      setCurrentTool(undefined);
      setAgentError(undefined);

      // Create new AbortController for this request
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
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.substring(6));
                // Handle different event types
                if (data.type === "chunk") {
                  setStreamingResponse((prev) => prev + data.content);
                } else if (data.type === "stage") {
                  // Update agent stage
                  setAgentStage(data.stage as AgentStage);
                  if (data.tool) {
                    setCurrentTool(data.tool);
                  }
                } else if (data.type === "error") {
                  setAgentStage("error");
                  setAgentError(data.content);
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }

        // Fetch final messages and update preview
        await fetchMessages();
        setIframeKey((prev) => prev + 1);
        setHasContent(true);
      } catch (e) {
        // Handle abort gracefully
        if (e instanceof Error && e.name === "AbortError") {
          console.log("Agent request cancelled by user");
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
        // Reset agent progress after a short delay to show completion
        const AGENT_COMPLETION_DISPLAY_MS = 1500;
        setTimeout(() => {
          setAgentStage(null);
          setAgentStartTime(undefined);
          setCurrentTool(undefined);
          setAgentError(undefined);
        }, AGENT_COMPLETION_DISPLAY_MS);
      }
    },
    [fetchMessages],
  );

  // Create app from prompt (prompt mode)

  const handleCreateApp = async () => {
    if ((!newMessage.trim() && pendingFiles.length === 0) || sendingMessage) {
      return;
    }

    const content = newMessage.trim();
    setSendingMessage(true);

    try {
      const formData = new FormData();
      formData.append("prompt", content || "[Files attached]");
      formData.append("codespaceId", codeSpace);

      pendingFiles.forEach((pf) => {
        formData.append("files", pf.file);
      });

      const response = await fetch("/api/apps", {
        method: "POST",
        body: pendingFiles.length > 0 ? formData : JSON.stringify({
          prompt: content,
          codespaceId: codeSpace,
        }),
        headers: pendingFiles.length > 0
          ? undefined
          : { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to create app");
      }

      const newApp = await response.json();

      // Update state to show workspace
      setApp(newApp);
      setNewMessage("");
      setPendingFiles([]);
      setMode("workspace");

      // Fetch messages for the new app with retry logic
      const fetchedMessages = await fetchMessagesWithRetry(newApp.id);
      setMessages(fetchedMessages);

      // Trigger agent to process the initial message
      // NOTE: The user's message is already saved to DB by POST /api/apps
      // Now we call the agent to generate a response
      // Note: Images are currently only supported in workspace mode - prompt mode uses files only
      await processMessageWithAgent(newApp.id, content || "[Files attached]");
    } catch (e) {
      console.error("Failed to create app", e);
      toast.error("Failed to create app. Please try again.");
    } finally {
      setSendingMessage(false);
    }
  };

  // Send message in workspace mode
  const handleSendMessage = async () => {
    if (
      (!newMessage.trim() && pendingImages.length === 0) || sendingMessage ||
      isStreaming
    ) return;
    if (!app?.id) return;

    const content = newMessage.trim();
    setNewMessage("");
    setSendingMessage(true);

    try {
      const imageIds = await uploadImages();

      // Optimistically add user message
      const optimId = `temp-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: optimId,
          role: "USER",
          content: content || "[Image attached]",
          createdAt: new Date().toISOString(),
        },
      ]);

      // Use shared helper for agent processing
      await processMessageWithAgent(app.id, content, imageIds);
    } catch (e) {
      console.error("Failed to send message", e);
      setAgentStage("error");
      setAgentError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSendingMessage(false);
    }
  };

  // Clear chat
  const handleClearChat = async () => {
    if (clearingChat || !app?.id) return;

    setClearingChat(true);
    try {
      const response = await fetch(`/api/apps/${app.id}/messages`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to clear chat");
      setMessages([]);
    } catch {
      console.error("Failed to clear chat");
    } finally {
      setClearingChat(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (mode === "prompt") {
        handleCreateApp();
      } else {
        handleSendMessage();
      }
    }
  };

  // Cancel agent processing
  const handleCancelAgent = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      toast.info("Agent processing cancelled");
    }
  };

  // Restore a code version
  const handleRestoreVersion = useCallback(async (versionId: string) => {
    if (!app?.id || restoringVersionId) return;

    setRestoringVersionId(versionId);
    try {
      const response = await fetch(
        `/api/apps/${app.id}/versions/${versionId}/restore`,
        { method: "POST" },
      );

      if (!response.ok) {
        throw new Error("Failed to restore version");
      }

      toast.success("Version restored successfully");
      setIframeKey((prev) => prev + 1);
      await fetchMessages();
    } catch (e) {
      console.error("Failed to restore version", e);
      toast.error("Failed to restore version");
    } finally {
      setRestoringVersionId(null);
    }
  }, [app?.id, restoringVersionId, fetchMessages]);

  // Loading state
  if (mode === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 pt-24 pb-8">
          <div className="mb-6 flex items-center gap-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-[600px]" />
            <Skeleton className="h-[600px]" />
          </div>
        </div>
      </div>
    );
  }

  // Error state (invalid codespace name)
  if (error && !app) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 pt-24 pb-8">
          <Card className="mx-auto max-w-md">
            <CardHeader>
              <CardTitle>Invalid Codespace</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/my-apps">
                <Button>Back to My Apps</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Render based on mode
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 overflow-x-hidden relative selection:bg-teal-500/30">
      {/* Ambient Glow Effects */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 -left-64 w-96 h-96 bg-teal-500/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 -right-64 w-96 h-96 bg-purple-500/10 rounded-full blur-[128px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-gradient-to-b from-teal-500/5 to-transparent blur-3xl opacity-50" />
      </div>

      <div className="container mx-auto px-4 pt-24 pb-8 relative z-10">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/my-apps"
              className="group flex items-center gap-2 text-zinc-400 hover:text-white transition-colors duration-200"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 border border-white/10 group-hover:bg-white/10 group-hover:border-white/20 transition-all">
                &larr;
              </div>
              <span className="font-medium">Back</span>
            </Link>
            {mode === "prompt" && (
              <Badge
                variant="secondary"
                className="bg-amber-500/20 text-amber-200 border-amber-500/30"
              >
                New App
              </Badge>
            )}
            {mode === "workspace" && agentWorking && (
              <Badge
                variant="secondary"
                className="bg-teal-500/20 text-teal-200 border-teal-500/30 animate-pulse"
              >
                Agent Working
              </Badge>
            )}
          </div>
          {mode === "workspace" && (
            <div className="flex gap-3">
              <Link href={codespaceUrl} target="_blank">
                <Button
                  className="rounded-full bg-white/5 border-white/10 hover:bg-white/10 text-white hover:text-white transition-all shadow-lg hover:shadow-xl backdrop-blur-sm"
                  variant="outline"
                >
                  Open in New Tab
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-2 lg:h-[calc(100vh-200px)] min-h-[600px]">
          {/* Chat Panel */}
          <Card className="flex flex-col h-full bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl rounded-3xl overflow-hidden ring-1 ring-white/5">
            <CardHeader className="border-b border-white/5 bg-white/[0.02] px-6 py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-zinc-100">
                  {mode === "prompt" ? "What would you like to build?" : "Chat"}
                </CardTitle>
                {mode === "workspace" && messages.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={clearingChat || app?.status === "ARCHIVED"}
                        className="text-zinc-400 hover:text-white hover:bg-white/5 rounded-full px-4 h-8 text-sm"
                      >
                        {clearingChat ? "Clearing..." : "Clear"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-zinc-900 border-white/10">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-zinc-100">
                          Clear chat history?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                          This will permanently delete all messages. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleClearChat}
                          className="bg-red-600 hover:bg-red-500 text-white"
                        >
                          Clear Chat
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              {mode === "prompt" && (
                <p className="text-sm text-zinc-400 mt-1">
                  Describe your app idea and attach any relevant files
                </p>
              )}
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden p-0 relative">
              <div className="h-full overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {mode === "prompt"
                  ? (
                    // Prompt mode - welcome state
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="flex h-full items-center justify-center text-center"
                    >
                      <div className="space-y-6 max-w-md">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-500/20 to-purple-500/20 mx-auto flex items-center justify-center border border-white/10 shadow-lg shadow-teal-500/5">
                          <svg
                            className="w-10 h-10 text-teal-400"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                            />
                          </svg>
                        </div>
                        <div className="space-y-3">
                          <h3 className="text-2xl font-semibold text-zinc-100">
                            Start with a prompt
                          </h3>
                          <p className="text-zinc-400 leading-relaxed">
                            Describe what you want to build and our AI will create it for you.
                          </p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2 pt-2">
                          {["PDF", "TXT", "JSON", "CSV", "MD"].map((type) => (
                            <span
                              key={type}
                              className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-400"
                            >
                              .{type.toLowerCase()}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )
                  : messages.length === 0
                  ? (
                    // Workspace mode - no messages yet
                    <div className="flex h-full items-center justify-center text-center text-zinc-500">
                      <div className="space-y-4 max-w-xs">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 mx-auto flex items-center justify-center border border-white/5">
                          <svg
                            className="w-8 h-8 text-zinc-400"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                          </svg>
                        </div>
                        <p className="text-lg font-medium text-zinc-300">
                          No messages yet
                        </p>
                        <p className="text-sm">
                          Start a conversation to begin building your app.
                        </p>
                      </div>
                    </div>
                  )
                  : (
                    // Workspace mode - messages
                    <div className="space-y-6">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.role === "USER"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-sm ${
                              message.role === "USER"
                                ? "bg-teal-600/90 text-white backdrop-blur-sm shadow-[0_4px_20px_-4px_rgba(20,184,166,0.3)]"
                                : message.role === "SYSTEM"
                                ? "bg-white/5 text-zinc-400 text-sm border border-white/5"
                                : "bg-white/10 text-zinc-100 backdrop-blur-md border border-white/5"
                            }`}
                          >
                            <div className="leading-relaxed">
                              {message.role === "AGENT"
                                ? <MarkdownContent content={message.content} />
                                : (
                                  <p className="whitespace-pre-wrap">
                                    {message.content}
                                  </p>
                                )}
                            </div>
                            {message.attachments &&
                              message.attachments.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {message.attachments.map((attachment) => (
                                  <Image
                                    key={attachment.image.id}
                                    src={attachment.image.originalUrl}
                                    alt="Attachment"
                                    width={80}
                                    height={80}
                                    className="h-20 w-20 rounded-lg object-cover ring-1 ring-white/10"
                                    unoptimized
                                  />
                                ))}
                              </div>
                            )}
                            {/* Version preview for agent messages */}
                            {message.role === "AGENT" && message.codeVersion && (
                              <ChatMessagePreview
                                codespaceUrl={codespaceUrl}
                                timestamp={new Date(message.codeVersion.createdAt)}
                                onRestore={() => handleRestoreVersion(message.codeVersion!.id)}
                                isRestoring={restoringVersionId === message.codeVersion.id}
                              />
                            )}
                            <p
                              className={`mt-1.5 text-xs ${
                                message.role === "USER"
                                  ? "text-teal-100/70"
                                  : "text-zinc-500"
                              }`}
                            >
                              {new Date(message.createdAt).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                {isStreaming && streamingResponse && (
                  <div className="flex justify-start mt-2">
                    <div className="max-w-[85%] rounded-2xl px-5 py-3 bg-white/10 text-zinc-100 backdrop-blur-md border border-white/5">
                      <div className="leading-relaxed">
                        <MarkdownContent content={streamingResponse} />
                        <span className="inline-block w-2 h-4 ml-1 bg-teal-500 animate-pulse rounded-full align-middle" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-4" />
              </div>
            </CardContent>

            {/* Sticky Agent Progress Indicator - between scroll and input */}
            {isStreaming && (
              <div className="mx-4 mb-2">
                <AgentProgressIndicator
                  stage={agentStage}
                  currentTool={currentTool}
                  errorMessage={agentError}
                  isVisible={isStreaming}
                  startTime={agentStartTime}
                  className="shadow-lg"
                />
                <div className="flex justify-center mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelAgent}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full px-4 h-8 text-sm gap-2"
                  >
                    <StopCircle className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="border-t border-white/5 bg-white/[0.02] p-4">
              {/* Pending Files Preview (prompt mode) */}
              {mode === "prompt" && pendingFiles.length > 0 && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {pendingFiles.map((pf) => (
                    <div
                      key={pf.id}
                      className="relative group flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10"
                    >
                      <FileText className="h-5 w-5 text-zinc-400" />
                      <div className="flex flex-col">
                        <span className="text-xs text-zinc-300 truncate max-w-[120px]">
                          {pf.file.name}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {formatFileSize(pf.file.size)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(pf.id)}
                        className="ml-1 h-5 w-5 rounded-full bg-white/10 text-zinc-400 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all"
                        aria-label="Remove file"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Pending Images Preview (workspace mode) */}
              {mode === "workspace" && pendingImages.length > 0 && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {pendingImages.map((img) => (
                    <div key={img.id} className="relative group">
                      <Image
                        src={img.previewUrl}
                        alt="Pending upload"
                        width={64}
                        height={64}
                        className="h-16 w-16 rounded-lg object-cover ring-1 ring-white/10"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(img.id)}
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 relative">
                {mode === "prompt"
                  ? (
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.pdf,.doc,.docx,.md,.json,.csv,.xml,.yaml,.yml,.js,.ts,.tsx,.jsx,.py,.java,.c,.cpp,.h,.hpp,.cs,.go,.rb,.php,.swift,.kt,.rs,.sql,.sh,.bash,.zsh"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                  )
                  : (
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                      id="image-upload"
                    />
                  )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => (mode === "prompt"
                    ? fileInputRef.current?.click()
                    : imageInputRef.current?.click())}
                  disabled={sendingMessage ||
                    uploadingImages ||
                    (mode === "prompt"
                      ? pendingFiles.length >= 10
                      : pendingImages.length >= 5)}
                  className="h-10 w-10 rounded-xl text-zinc-500 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                  aria-label={mode === "prompt"
                    ? "Attach files"
                    : "Attach images"}
                >
                  {mode === "prompt"
                    ? <Paperclip className="h-5 w-5" />
                    : <ImagePlus className="h-5 w-5" />}
                </Button>
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={mode === "prompt"
                    ? "E.g., A personal finance tracker with charts..."
                    : "Type your message..."}
                  autoComplete="off"
                  className="min-h-[60px] max-h-[200px] resize-none bg-black/20 border-white/10 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 rounded-2xl pl-4 pr-14 py-3 text-zinc-200 placeholder:text-zinc-600 backdrop-blur-sm transition-all"
                  disabled={sendingMessage ||
                    (mode === "workspace" && app?.status === "ARCHIVED")}
                  autoFocus={mode === "prompt"}
                />
                <Button
                  onClick={mode === "prompt"
                    ? handleCreateApp
                    : handleSendMessage}
                  disabled={(mode === "prompt"
                    ? !newMessage.trim() && pendingFiles.length === 0
                    : !newMessage.trim() && pendingImages.length === 0) ||
                    sendingMessage ||
                    uploadingImages ||
                    (mode === "workspace" && app?.status === "ARCHIVED")}
                  aria-label={mode === "prompt"
                    ? "Start building"
                    : "Send message"}
                  className={`absolute right-2 bottom-2 h-10 ${
                    mode === "prompt" ? "px-4" : "w-10 p-0"
                  } rounded-xl transition-all duration-300 ${
                    (mode === "prompt"
                        ? !newMessage.trim() && pendingFiles.length === 0
                        : !newMessage.trim() && pendingImages.length === 0) ||
                      sendingMessage ||
                      uploadingImages
                      ? "bg-white/5 text-zinc-500"
                      : "bg-teal-500 hover:bg-teal-400 text-white shadow-[0_0_20px_-5px_rgba(20,184,166,0.6)]"
                  }`}
                >
                  {sendingMessage || uploadingImages
                    ? (
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )
                    : mode === "prompt"
                    ? <span className="font-medium">Start</span>
                    : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-5 h-5 ml-0.5"
                      >
                        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                      </svg>
                    )}
                </Button>
              </div>
              <div className="mt-2 text-center">
                <p className="text-[10px] text-zinc-600">
                  Press{" "}
                  <kbd className="font-sans px-1 py-0.5 bg-white/5 rounded border border-white/10 text-zinc-500">
                    Enter
                  </kbd>{" "}
                  to {mode === "prompt" ? "start" : "send"} • Click {mode === "prompt"
                    ? <Paperclip className="inline h-3 w-3" />
                    : <ImagePlus className="inline h-3 w-3" />} to attach{" "}
                  {mode === "prompt" ? "files" : "images"}
                </p>
              </div>
            </div>
          </Card>

          {/* Preview Panel */}
          <div className="flex flex-col gap-3 h-full">
            <motion.div
              layoutId={`app-card-${codeSpace}`}
              className="flex-1 h-full min-h-[500px]"
            >
              <Card className="flex flex-col h-full overflow-hidden bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl rounded-3xl ring-1 ring-white/5 relative group">
                <div className="absolute -inset-[1px] bg-gradient-to-br from-white/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <BrowserToolbar
                  url={codespaceUrl}
                  onRefresh={() => setIframeKey((prev) => prev + 1)}
                />

                <CardContent className="flex-1 overflow-hidden p-0 md:p-0 relative bg-zinc-950/50 z-10 rounded-b-3xl">
                  {hasContent
                    ? (
                      <iframe
                        key={iframeKey}
                        src={codespaceUrl}
                        className="border-0 w-full h-full rounded-b-3xl"
                        style={{
                          width: "200%",
                          height: "200%",
                          transform: "scale(0.5)",
                          transformOrigin: "0 0",
                        }}
                        title={`Preview of ${codeSpace}`}
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                      />
                    )
                    : <PreviewPlaceholder />}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
