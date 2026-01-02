"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { BoxMessageRole } from "@prisma/client";
import { BoxStatus } from "@prisma/client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface BoxMessage {
  id: string;
  role: BoxMessageRole;
  content: string;
  createdAt: Date;
}

interface Box {
  id: string;
  name: string;
  description?: string | null;
  status: BoxStatus;
  connectionUrl?: string | null;
  messages?: BoxMessage[];
}

interface AgentControlPanelProps {
  box: Box;
}

/**
 * Agent Control Panel component that provides a split-view interface
 * for chatting with an agent and viewing its live desktop session.
 *
 * Features:
 * - Real-time chat with agent
 * - Auto-scrolling message list
 * - Live VNC/NoVNC session viewer
 * - Agent control actions (pause, restart, debug)
 * - Status indicator with color-coded badges
 *
 * @param box - The Box object containing agent details, status, and message history
 */
export function AgentControlPanel({ box }: AgentControlPanelProps) {
  const [messages, setMessages] = useState<BoxMessage[]>(box.messages || []);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getStatusColor = (status: BoxStatus) => {
    switch (status) {
      case BoxStatus.RUNNING:
        return "bg-green-500";
      case BoxStatus.PAUSED:
        return "bg-yellow-500";
      case BoxStatus.STOPPED:
      case BoxStatus.STOPPING:
        return "bg-red-500";
      case BoxStatus.CREATING:
      case BoxStatus.STARTING:
        return "bg-blue-500";
      case BoxStatus.ERROR:
        return "bg-red-600";
      case BoxStatus.TERMINATED:
        return "bg-gray-600";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusBadgeVariant = (status: BoxStatus) => {
    switch (status) {
      case BoxStatus.RUNNING:
        return "default";
      case BoxStatus.PAUSED:
        return "secondary";
      case BoxStatus.STOPPED:
      case BoxStatus.STOPPING:
      case BoxStatus.TERMINATED:
        return "destructive";
      case BoxStatus.CREATING:
      case BoxStatus.STARTING:
        return "secondary";
      case BoxStatus.ERROR:
        return "destructive";
      default:
        return "outline";
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const content = inputValue;
    setInputValue("");
    setIsTyping(true);

    try {
      const response = await fetch(`/api/boxes/${box.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();

      // Add both user message and agent response
      setMessages((prev) => [
        ...prev,
        {
          ...data.userMessage,
          createdAt: new Date(data.userMessage.createdAt),
        },
        {
          ...data.agentMessage,
          createdAt: new Date(data.agentMessage.createdAt),
        },
      ]);
    } catch (error) {
      toast.error("Failed to send message");
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAction = async (action: "STOP" | "RESTART" | "DEBUG") => {
    try {
      if (action === "DEBUG") {
        toast.info("Debug mode is not yet implemented");
        return;
      }

      toast.info(`${action === "STOP" ? "Pausing" : "Restarting"} agent...`);

      const response = await fetch(`/api/boxes/${box.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error("Action failed");
      }

      toast.success(
        `Agent ${action === "STOP" ? "paused" : "restarted"} successfully`,
      );
      // In a real app, you might want to refresh the page or update the status
      window.location.reload();
    } catch (error) {
      toast.error("Failed to perform action");
      console.error(error);
    }
  };

  return (
    <div className="flex h-[calc(100vh-200px)] gap-4">
      <div className="w-2/5 flex flex-col">
        <Card className="flex flex-col h-full">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-lg font-semibold">Chat</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === "USER" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2 backdrop-blur-xl",
                    message.role === "USER"
                      ? "bg-gradient-primary text-white"
                      : "bg-white/10 text-foreground",
                  )}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-4 py-2 bg-white/10 text-foreground backdrop-blur-xl">
                  <p className="text-sm">Typing...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                className="min-h-[60px] resize-none"
                aria-label="Message input"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                onClick={handleSendMessage}
                size="default"
                className="self-end"
                aria-label="Send message"
              >
                Send
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="w-3/5 flex flex-col">
        <Card className="flex flex-col h-full">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Live Session</h2>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    getStatusColor(box.status),
                  )}
                />
                <Badge variant={getStatusBadgeVariant(box.status)}>
                  {box.status}
                </Badge>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction("STOP")}
                aria-label="Pause agent"
              >
                Pause
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction("RESTART")}
                aria-label="Restart agent"
              >
                Restart
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction("DEBUG")}
                aria-label="Debug agent"
              >
                Debug
              </Button>
            </div>
          </div>

          <div className="flex-1 relative bg-black/20">
            {box.connectionUrl
              ? (
                <iframe
                  src={box.connectionUrl}
                  className="w-full h-full absolute inset-0"
                  title="Live Session"
                />
              )
              : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>Connecting to session...</p>
                </div>
              )}
          </div>
        </Card>
      </div>
    </div>
  );
}
