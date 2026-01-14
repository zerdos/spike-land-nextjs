"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { APP_BUILD_STATUSES } from "@/lib/validations/app";
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

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Stream state
  const [streamingResponse, setStreamingResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-24 pb-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/my-apps"
              className="text-muted-foreground hover:text-foreground"
            >
              &larr; Back
            </Link>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {app.name}
            </h1>
            <Badge variant={getStatusVariant(app.status)}>
              {app.status.replace("_", " ")}
            </Badge>
            {agentWorking && (
              <Badge variant="secondary" className="animate-pulse">
                Agent Working
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {app.codespaceUrl && (
              <Link href={app.codespaceUrl} target="_blank">
                <Button variant="outline" size="sm">
                  Open in New Tab
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Chat Panel */}
          <Card className="flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Chat</CardTitle>
                  <CardDescription>
                    Communicate with the AI agent to refine your app
                  </CardDescription>
                </div>
                {messages.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearChat}
                    disabled={clearingChat || app.status === "ARCHIVED"}
                  >
                    {clearingChat ? "Clearing..." : "Clear Chat"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              {/* Messages */}
              <div className="h-full overflow-y-auto p-4">
                {messages.length === 0
                  ? (
                    <div className="flex h-full items-center justify-center text-center text-muted-foreground">
                      <p>No messages yet. Start a conversation!</p>
                    </div>
                  )
                  : (
                    <div className="space-y-4">
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
                            className={`max-w-[80%] rounded-lg px-4 py-2 ${
                              message.role === "USER"
                                ? "bg-primary text-primary-foreground"
                                : message.role === "SYSTEM"
                                ? "bg-muted text-muted-foreground text-sm italic"
                                : "bg-secondary text-secondary-foreground"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">
                              {message.role === "AGENT"
                                ? formatWithParagraphs(message.content)
                                : message.content}
                            </p>
                            {message.attachments &&
                              message.attachments.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {message.attachments.map((attachment) => (
                                  <Image
                                    key={attachment.image.id}
                                    src={attachment.image.originalUrl}
                                    alt="Attachment"
                                    width={80}
                                    height={80}
                                    className="h-20 w-20 rounded object-cover"
                                    unoptimized
                                  />
                                ))}
                              </div>
                            )}
                            <p className="mt-1 text-xs opacity-70">
                              {new Date(message.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                {isStreaming && streamingResponse && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-lg px-4 py-2 bg-secondary text-secondary-foreground">
                      <p className="whitespace-pre-wrap">
                        {formatWithParagraphs(streamingResponse)}
                        <span className="animate-pulse">▊</span>
                      </p>
                      <p className="mt-1 text-xs opacity-70">Thinking...</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            {/* Message Input */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message... (Press Enter to send)"
                  className="min-h-[60px] resize-none"
                  disabled={sendingMessage || app.status === "ARCHIVED"}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendingMessage ||
                    app.status === "ARCHIVED"}
                  className="shrink-0"
                >
                  {sendingMessage ? "Sending..." : "Send"}
                </Button>
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-6">
            {/* Preview Panel */}
            <Card className="flex flex-col h-[500px] overflow-hidden bg-zinc-950 border-zinc-800">
              {/* Browser Toolbar */}
              <div className="flex items-center gap-4 border-b border-zinc-800 bg-zinc-900/50 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/20 hover:bg-red-500 transition-colors" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/20 hover:bg-yellow-500 transition-colors" />
                  <div className="h-3 w-3 rounded-full bg-green-500/20 hover:bg-green-500 transition-colors" />
                </div>

                <div className="flex-1 flex items-center justify-center">
                  <div className="flex w-full max-w-sm items-center gap-2 rounded-md bg-zinc-950/50 px-3 py-1.5 text-xs text-zinc-500">
                    <div className="h-2 w-2 rounded-full bg-zinc-700" />
                    <span>
                      {app.codespaceUrl?.replace("https://", "") ||
                        "localhost:3000"}
                    </span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-zinc-500 hover:text-zinc-300"
                  onClick={() => setIframeKey((prev) => prev + 1)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
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

              <CardContent className="flex-1 overflow-hidden p-0 md:p-0 relative bg-zinc-950">
                {app.codespaceUrl
                  ? (
                    <iframe
                      key={iframeKey}
                      src={app.codespaceUrl}
                      className="border-0"
                      style={{
                        display: "block",
                        width: "200.5%",
                        height: "200.5%",
                        transform: "scale(0.5)",
                        transformOrigin: "0 0",
                      }}
                      title={`Preview of ${app.name}`}
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                  )
                  : (
                    <div className="flex h-full items-center justify-center text-center text-muted-foreground bg-zinc-950">
                      <div className="space-y-2">
                        <div className="mx-auto h-12 w-12 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-700 mb-4">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
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
                        <p>Preview will appear here</p>
                        <p className="text-sm opacity-50">
                          Start chatting to generate your app
                        </p>
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Console Log */}
            <Card className="flex flex-col h-[200px] bg-[#0d0d0d] border-zinc-800 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
                <div className="flex items-center gap-2 text-zinc-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="4 17 10 11 4 5" />
                    <line x1="12" x2="20" y1="19" y2="19" />
                  </svg>
                  <span>Terminal</span>
                </div>
                <div className="flex gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                  <div className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                  <div className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                </div>
              </div>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-1">
                <div className="text-zinc-500 mb-2">
                  <span className="text-green-500">➜</span>
                  <span className="text-cyan-500 ml-2">~</span>
                  <span className="ml-2">tailing logs...</span>
                </div>
                <div className="text-zinc-400 font-mono">
                  <span className="text-blue-400">[Claude Code Agent]</span>{" "}
                  Fetching latest changes...
                </div>
                <div className="text-zinc-400 font-mono">
                  <span className="text-blue-400">[Claude Code Agent]</span>{" "}
                  <span className="text-green-400">
                    App updated successfully.
                  </span>
                </div>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="text-zinc-600 font-mono">
                    <span className="text-zinc-700">[Claude Code Agent]</span>{" "}
                    [{new Date().toLocaleDateString()}, {new Date().toLocaleTimeString()}]
                  </div>
                ))}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-green-500">➜</span>
                  <span className="h-4 w-2 bg-zinc-500 animate-pulse" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Status History */}
        {app.statusHistory && app.statusHistory.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {app.statusHistory.slice(0, 5).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {entry.status.replace("_", " ")}
                      </Badge>
                      <span className="text-muted-foreground">
                        {entry.message || "Status changed"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
