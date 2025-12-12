"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type BoxStatus = "STOPPED" | "STARTING" | "RUNNING" | "PAUSED" | "ERROR";

type BoxMessageRole = "USER" | "AGENT" | "SYSTEM";

interface BoxMessage {
  id: string;
  role: BoxMessageRole;
  content: string;
  createdAt: Date;
}

interface Box {
  id: string;
  name: string;
  description?: string;
  status: BoxStatus;
  connectionUrl?: string;
  messages?: BoxMessage[];
}

interface AgentControlPanelProps {
  box: Box;
}

export function AgentControlPanel({ box }: AgentControlPanelProps) {
  const [messages, setMessages] = useState<BoxMessage[]>(box.messages || []);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const getStatusColor = (status: BoxStatus) => {
    switch (status) {
      case "RUNNING":
        return "bg-green-500";
      case "STOPPED":
      case "PAUSED":
        return "bg-red-500";
      case "STARTING":
        return "bg-yellow-500";
      case "ERROR":
        return "bg-red-600";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusBadgeVariant = (status: BoxStatus) => {
    switch (status) {
      case "RUNNING":
        return "default";
      case "STOPPED":
      case "PAUSED":
        return "destructive";
      case "STARTING":
        return "secondary";
      default:
        return "outline";
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const newMessage: BoxMessage = {
      id: `temp-${Date.now()}`,
      role: "USER",
      content: inputValue,
      createdAt: new Date(),
    };

    setMessages([...messages, newMessage]);
    setInputValue("");
    setIsTyping(true);

    setTimeout(() => {
      const agentResponse: BoxMessage = {
        id: `temp-agent-${Date.now()}`,
        role: "AGENT",
        content: "Message received. This is a placeholder response.",
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, agentResponse]);
      setIsTyping(false);
    }, 1000);
  };

  const handleAction = async (action: "STOP" | "RESTART") => {
    try {
      toast.info(`${action === "STOP" ? "Pausing" : "Restarting"} agent...`);
    } catch (error) {
      toast.error("Failed to perform action");
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
          </div>

          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                className="min-h-[60px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button onClick={handleSendMessage} size="default" className="self-end">
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
                <div className={cn("w-2 h-2 rounded-full", getStatusColor(box.status))} />
                <Badge variant={getStatusBadgeVariant(box.status)}>{box.status}</Badge>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleAction("STOP")}>
                Pause
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleAction("RESTART")}>
                Restart
              </Button>
              <Button variant="outline" size="sm">
                Debug
              </Button>
            </div>
          </div>

          <div className="flex-1 relative bg-black/20">
            {box.connectionUrl ? (
              <iframe
                src={box.connectionUrl}
                className="w-full h-full absolute inset-0"
                title="Live Session"
              />
            ) : (
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
