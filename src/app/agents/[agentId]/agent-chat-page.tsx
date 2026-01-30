"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { tryCatch } from "@/lib/try-catch";
import { cn } from "@/lib/utils";
import type { AgentMessageResponse, AgentResponse } from "@/lib/validations/agent";
import {
  Activity,
  ArrowLeft,
  Bot,
  Clock,
  Code2,
  FolderOpen,
  Loader2,
  Send,
  User,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const statusConfig = {
  online: {
    label: "Online",
    variant: "success" as const,
    dotClass: "bg-aurora-green animate-pulse",
  },
  sleeping: {
    label: "Sleeping",
    variant: "warning" as const,
    dotClass: "bg-aurora-yellow",
  },
  offline: {
    label: "Offline",
    variant: "outline" as const,
    dotClass: "bg-gray-400",
  },
};

interface AgentChatPageProps {
  agent: AgentResponse;
  initialMessages: AgentMessageResponse[];
}

export function AgentChatPage({ agent, initialMessages }: AgentChatPageProps) {
  const [messages, setMessages] = useState<AgentMessageResponse[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState(agent.status);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const statusInfo = statusConfig[status];

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Poll for new messages
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      const { data } = await tryCatch(
        fetch(`/api/agents/${agent.id}/messages?limit=50`).then((r) => r.json()),
      );

      if (data?.messages) {
        setMessages(data.messages);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [agent.id]);

  // Poll for status updates
  useEffect(() => {
    const statusInterval = setInterval(async () => {
      const { data } = await tryCatch(
        fetch(`/api/agents/${agent.id}`).then((r) => r.json()),
      );

      if (data?.status) {
        setStatus(data.status);
      }
    }, 10000);

    return () => clearInterval(statusInterval);
  }, [agent.id]);

  // Send message
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);

    const { data, error } = await tryCatch(
      fetch(`/api/agents/${agent.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage.trim() }),
      }).then((r) => r.json()),
    );

    setIsSending(false);

    if (error || !data?.message) {
      // Show error toast
      console.error("Failed to send message:", error || data?.error);
      return;
    }

    // Add message to list
    setMessages((prev) => [...prev, data.message]);
    setNewMessage("");

    // Focus textarea
    textareaRef.current?.focus();
  }, [agent.id, newMessage, isSending]);

  // Handle keyboard submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Calculate time since last seen
  const getTimeSince = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/agents"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Agents
      </Link>

      {/* Agent info header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Status indicator */}
              <div className="relative">
                <div className={cn("h-4 w-4 rounded-full", statusInfo.dotClass)} />
                {status === "online" && (
                  <div className="absolute inset-0 h-4 w-4 animate-ping rounded-full bg-aurora-green/50" />
                )}
              </div>
              <div>
                <CardTitle className="text-xl">{agent.displayName}</CardTitle>
                <CardDescription className="text-sm">
                  {agent.machineId.slice(0, 8)}:{agent.sessionId.slice(0, 8)}
                </CardDescription>
              </div>
            </div>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Project info */}
          {agent.projectPath && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FolderOpen className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{agent.projectPath}</span>
            </div>
          )}

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Last seen: {getTimeSince(agent.lastSeenAt)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              <span>{agent.totalTasksCompleted} tasks</span>
            </div>
            <div className="flex items-center gap-1">
              <Code2 className="h-3 w-3" />
              <span>{agent.totalTokensUsed.toLocaleString()} tokens</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chat area */}
      <Card className="flex flex-col h-[60vh]">
        <CardHeader className="pb-2 border-b">
          <CardTitle className="text-sm font-medium">Messages</CardTitle>
        </CardHeader>

        {/* Messages list */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0
              ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No messages yet. Send a message to start the conversation.
                </div>
              )
              : messages.map((message) => <MessageBubble key={message.id} message={message} />)}
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              placeholder={status === "offline"
                ? "Agent is offline. Messages will be delivered when it reconnects."
                : "Type a message..."}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[60px] resize-none"
              disabled={isSending}
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || isSending}
              size="icon"
              className="h-[60px] w-[60px]"
            >
              {isSending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </Card>
    </div>
  );
}

function MessageBubble({ message }: { message: AgentMessageResponse; }) {
  const isUser = message.role === "USER";
  const isSystem = message.role === "SYSTEM";

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary" />
          </div>
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted",
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p
          className={cn(
            "text-[10px] mt-1",
            isUser ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {formatTime(message.createdAt)}
        </p>
      </div>

      {isUser && (
        <div className="flex-shrink-0">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <User className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>
      )}
    </div>
  );
}
