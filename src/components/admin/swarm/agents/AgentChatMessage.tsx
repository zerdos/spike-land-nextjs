"use client";

import { cn } from "@/lib/utils";
import type { AgentChatMessage as ChatMsg } from "@/lib/admin/swarm/types";
import { Bot, User } from "lucide-react";

interface AgentChatMessageProps {
  message: ChatMsg;
}

export function AgentChatMessage({ message }: AgentChatMessageProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser && "flex-row-reverse",
      )}
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary/20" : "bg-muted",
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary" />
        ) : (
          <Bot className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-3 py-2 text-sm",
          isUser && "bg-primary text-primary-foreground",
          !isUser && !isSystem && "bg-muted",
          isSystem && "bg-yellow-500/10 text-yellow-500 text-xs italic",
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        <time className="mt-1 block text-[10px] opacity-60">
          {new Date(message.timestamp).toLocaleTimeString()}
        </time>
      </div>
    </div>
  );
}
