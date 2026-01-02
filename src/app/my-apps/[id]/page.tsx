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
            break;

          case "status":
            setApp((prev) => prev ? { ...prev, status: data.data.status } : null);
            break;

          case "agent_working":
            setAgentWorking(data.data.isWorking);
            break;

          case "code_updated":
            // Reload iframe
            setIframeKey((prev) => prev + 1);
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
  }, [appId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      const response = await fetch(`/api/apps/${appId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage.trim() }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      setNewMessage("");
      // Message will be added via SSE
    } catch {
      console.error("Failed to send message");
    } finally {
      setSendingMessage(false);
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
            <Link href="/my-apps" className="text-muted-foreground hover:text-foreground">
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
              <CardTitle className="text-lg">Chat</CardTitle>
              <CardDescription>
                Communicate with the AI agent to refine your app
              </CardDescription>
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
                            message.role === "USER" ? "justify-end" : "justify-start"
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
                            <p className="whitespace-pre-wrap">{message.content}</p>
                            {message.attachments && message.attachments.length > 0 && (
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
                  disabled={!newMessage.trim() || sendingMessage || app.status === "ARCHIVED"}
                  className="shrink-0"
                >
                  {sendingMessage ? "Sending..." : "Send"}
                </Button>
              </div>
            </div>
          </Card>

          {/* Preview Panel */}
          <Card className="flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Preview</CardTitle>
              <CardDescription>
                {app.codespaceUrl
                  ? "Live preview of your app"
                  : "Preview will appear when your app is ready"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              {app.codespaceUrl
                ? (
                  <iframe
                    key={iframeKey}
                    src={app.codespaceUrl}
                    className="h-full w-full border-0"
                    title={`Preview of ${app.name}`}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />
                )
                : (
                  <div className="flex h-full items-center justify-center text-center text-muted-foreground">
                    <div className="space-y-2">
                      <p>No preview available yet</p>
                      <p className="text-sm">
                        Send a message to start building your app
                      </p>
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>
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
