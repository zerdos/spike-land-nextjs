"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { APP_BUILD_STATUSES } from "@/lib/validations/app";
import { motion } from "framer-motion";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

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

type StatusVariant = "default" | "secondary" | "destructive" | "outline";

function getStatusVariant(status: string): StatusVariant {
  switch (status) {
    case "LIVE":
      return "default";
    case "FAILED":
    case "ARCHIVED":
      return "destructive";
    case "BUILDING":
    case "DRAFTING":
    case "FINE_TUNING":
      return "secondary";
    default:
      return "outline";
  }
}

/**
 * Format agent response with proper paragraph breaks.
 * Detects sentence endings followed by capital letters and adds line breaks.
 */
function formatWithParagraphs(text: string): string {
  if (!text) return text;

  // Add line breaks after sentence endings (. ! ?) followed by a space and capital letter
  // But don't break inside code blocks or after abbreviations like "Dr." or "e.g."
  return text
    // Preserve existing double newlines
    .replace(/\n\n/g, "\n\n")
    // Add paragraph breaks after sentences followed by capital letters
    // Excludes cases like "Dr. Smith" or "e.g. Example" or URLs
    .replace(/([.!?])(\s+)([A-Z])/g, (_match, punct, _space, letter) => {
      // Add paragraph break after sentence endings followed by capital letters
      return `${punct}\n\n${letter}`;
    });
}

export default function AppWorkspacePage() {
  const params = useParams();
  const appId = params.id as string;

  const [app, setApp] = useState<AppData | null>(null);
  const [messages, setMessages] = useState<AppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [agentWorking, setAgentWorking] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch app data
  const fetchApp = useCallback(async () => {
    try {
      const response = await fetch(`/api/apps/${appId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("App not found");
          return;
        }
        throw new Error("Failed to fetch app");
      }
      const data = await response.json();
      setApp(data);
      setAgentWorking(data.agentWorking || false);
    } catch {
      setError("Failed to load app");
    }
  }, [appId]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/apps/${appId}/messages`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      const data = await response.json();
      // Messages come in descending order, reverse for display
      setMessages((data.messages || []).reverse());
    } catch {
      console.error("Failed to load messages");
    }
  }, [appId]);

  // Initial load
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      await Promise.all([fetchApp(), fetchMessages()]);
      setLoading(false);
    }
    loadData();
  }, [fetchApp, fetchMessages]);

  // Set up SSE connection
  useEffect(() => {
    if (!appId) return;

    const eventSource = new EventSource(`/api/apps/${appId}/messages/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "message":
            setMessages((prev) => {
              // Check if message already exists
              if (prev.some((m) => m.id === data.data.id)) return prev;
              return [...prev, data.data];
            });
            // Reload iframe when agent responds
            if (data.data.role === "AGENT") {
              setIframeKey((prev) => prev + 1);
            }
            break;

          case "status":
            setApp((prev) => prev ? { ...prev, status: data.data.status } : null);
            break;

          case "agent_working":
            setAgentWorking(data.data.isWorking);
            break;

          case "code_updated":
            // Reload iframe to show new code
            setIframeKey((prev) => prev + 1);
            // Also refresh app data in case codespaceUrl or other details changed
            fetchApp();
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
  }, [appId, fetchApp]);

  // Stream state
  const [streamingResponse, setStreamingResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  // Scroll to bottom when messages change or during streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingResponse]);

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || sendingMessage || isStreaming) return;

    const content = newMessage.trim();
    setNewMessage("");
    setSendingMessage(true);
    setIsStreaming(true);
    setStreamingResponse("");

    try {
      // Optimistically add user message
      const optimId = `temp-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: optimId,
          role: "USER",
          content,
          createdAt: new Date().toISOString(),
        },
      ]);

      const response = await fetch(`/api/apps/${appId}/agent/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      // Handle streaming response
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
        // Keep the last line in the buffer as it might be incomplete
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.type === "chunk") {
                setStreamingResponse((prev) => prev + data.content);
              } else if (data.type === "status") {
                console.log("Agent status:", data.content);
              }
            } catch (e) {
              console.error("Error parsing SSE data", e);
            }
          }
        }
      }

      // Refresh messages to get the persisted agent message
      await fetchMessages();
      // Reload iframe to show changes
      setIframeKey((prev) => prev + 1);
    } catch (e) {
      console.error("Failed to send message", e);
      // Revert optimistic message on error (optional, or show error)
    } finally {
      setSendingMessage(false);
      setIsStreaming(false);
      setStreamingResponse("");
    }
  };

  // Clear chat
  const [clearingChat, setClearingChat] = useState(false);
  const handleClearChat = async () => {
    if (clearingChat) return;

    setClearingChat(true);
    try {
      const response = await fetch(`/api/apps/${appId}/messages`, {
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

  // Handle key press for send
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
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

  if (error || !app) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 pt-24 pb-8">
          <Card className="mx-auto max-w-md">
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>
                {error || "App not found"}
              </CardDescription>
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
            <div className="h-8 w-px bg-white/10 mx-2" />
            <div className="flex flex-col">
              <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
                {app.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={getStatusVariant(app.status)}
                  className="bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300 pointer-events-none"
                >
                  {app.status.replace("_", " ")}
                </Badge>
                {agentWorking && (
                  <Badge
                    variant="secondary"
                    className="bg-teal-500/20 text-teal-200 border-teal-500/30 animate-pulse"
                  >
                    Agent Working
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            {app.codespaceUrl && (
              <Link href={app.codespaceUrl} target="_blank">
                <Button
                  className="rounded-full bg-white/5 border-white/10 hover:bg-white/10 text-white hover:text-white transition-all shadow-lg hover:shadow-xl backdrop-blur-sm"
                  variant="outline"
                >
                  Open in New Tab
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-2 lg:h-[calc(100vh-200px)] min-h-[600px]">
          {/* Chat Panel */}
          <Card className="flex flex-col h-full bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl rounded-3xl overflow-hidden ring-1 ring-white/5">
            <CardHeader className="border-b border-white/5 bg-white/[0.02] px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold text-zinc-100">Chat</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Communicate with the AI agent to refine your app
                  </CardDescription>
                </div>
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearChat}
                    disabled={clearingChat || app.status === "ARCHIVED"}
                    className="text-zinc-400 hover:text-white hover:bg-white/5 rounded-full px-4"
                  >
                    {clearingChat ? "Clearing..." : "Clear Chat"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0 relative">
              {/* Messages */}
              <div className="h-full overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {messages.length === 0
                  ? (
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
                        <p className="text-lg font-medium text-zinc-300">No messages yet</p>
                        <p className="text-sm">Start a conversation to begin building your app.</p>
                      </div>
                    </div>
                  )
                  : (
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
                            <p className="whitespace-pre-wrap leading-relaxed">
                              {message.role === "AGENT"
                                ? formatWithParagraphs(message.content)
                                : message.content}
                            </p>
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
                            <p
                              className={`mt-1.5 text-xs ${
                                message.role === "USER" ? "text-teal-100/70" : "text-zinc-500"
                              }`}
                            >
                              {new Date(message.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                {isStreaming && streamingResponse && (
                  <div className="flex justify-start mt-6">
                    <div className="max-w-[85%] rounded-2xl px-5 py-3 bg-white/10 text-zinc-100 backdrop-blur-md border border-white/5">
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {formatWithParagraphs(streamingResponse)}
                        <span className="inline-block w-2 h-4 ml-1 bg-teal-500 animate-pulse rounded-full align-middle" />
                      </p>
                      <p className="mt-1.5 text-xs text-zinc-500">Thinking...</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-4" />
              </div>
            </CardContent>
            {/* Message Input */}
            <div className="border-t border-white/5 bg-white/[0.02] p-4">
              <div className="flex gap-3 relative">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  autoComplete="off"
                  className="min-h-[60px] max-h-[200px] resize-none bg-black/20 border-white/10 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 rounded-2xl pl-4 pr-4 py-3 text-zinc-200 placeholder:text-zinc-600 backdrop-blur-sm transition-all"
                  disabled={sendingMessage || app.status === "ARCHIVED"}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendingMessage ||
                    app.status === "ARCHIVED"}
                  aria-label="Send message"
                  className={`absolute right-2 bottom-2 h-10 w-10 p-0 rounded-xl transition-all duration-300 ${
                    !newMessage.trim() || sendingMessage
                      ? "bg-white/5 text-zinc-500"
                      : "bg-teal-500 hover:bg-teal-400 text-white shadow-[0_0_20px_-5px_rgba(20,184,166,0.6)]"
                  }`}
                >
                  {sendingMessage
                    ? (
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )
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
                  to send
                </p>
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-3 h-full">
            {/* Preview Panel */}
            <motion.div layoutId={`app-card-${app.id}`} className="flex-1 h-full min-h-[500px]">
              <Card className="flex flex-col h-full overflow-hidden bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl rounded-3xl ring-1 ring-white/5 relative group">
                {/* Glow effect for preview card */}
                <div className="absolute -inset-[1px] bg-gradient-to-br from-white/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                {/* Browser Toolbar */}
                <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-5 py-4 relative z-10">
                  <div className="flex gap-2">
                    <div className="h-3 w-3 rounded-full bg-[#FF5F56] border border-white/5 shadow-inner" />
                    <div className="h-3 w-3 rounded-full bg-[#FFBD2E] border border-white/5 shadow-inner" />
                    <div className="h-3 w-3 rounded-full bg-[#27C93F] border border-white/5 shadow-inner" />
                  </div>

                  <div className="flex-1 mx-4 max-w-xl">
                    <div className="bg-black/20 rounded-lg border border-white/5 py-1.5 px-3 flex items-center justify-center">
                      <div
                        data-testid="address-bar"
                        className="text-[11px] text-zinc-400 truncate font-mono w-full text-center"
                      >
                        {app.codespaceUrl || "localhost"}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full transition-colors shrink-0"
                    onClick={() => setIframeKey((prev) => prev + 1)}
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

                <CardContent className="flex-1 overflow-hidden p-0 md:p-0 relative bg-zinc-950/50 z-10 rounded-b-3xl">
                  {app.codespaceUrl
                    ? (
                      <iframe
                        key={iframeKey}
                        src={app.codespaceUrl}
                        className="border-0 w-full h-full rounded-b-3xl"
                        style={{
                          width: "200%",
                          height: "200%",
                          transform: "scale(0.5)",
                          transformOrigin: "0 0",
                        }}
                        title={`Preview of ${app.name}`}
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                      />
                    )
                    : (
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
                              <rect
                                width="18"
                                height="18"
                                x="3"
                                y="3"
                                rx="2"
                                ry="2"
                              />
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
                    )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
