"use client";

import { AgentProgressIndicator } from "@/components/my-apps/AgentProgressIndicator";
import { useEffect, useRef } from "react";
import type { VibeMessage } from "./vibe-code-provider";
import { useVibeCode } from "./vibe-code-provider";

function renderMarkdown(text: string): string {
  // Split by code blocks first
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts
    .map((part) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const code = part.slice(3, -3).replace(/^\w*\n/, "");
        return `<pre class="bg-black/30 rounded-md p-2 my-1 overflow-x-auto text-xs"><code>${escapeHtml(code)}</code></pre>`;
      }
      // Inline code
      let result = part.replace(
        /`([^`]+)`/g,
        '<code class="bg-black/30 px-1 rounded text-xs">$1</code>',
      );
      // Bold
      result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      // Italic
      result = result.replace(/\*(.+?)\*/g, "<em>$1</em>");
      // Newlines
      result = result.replace(/\n/g, "<br />");
      return result;
    })
    .join("");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function MessageBubble({ message }: { message: VibeMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {message.images && message.images.length > 0 && (
          <div className="flex gap-1 mb-2 flex-wrap">
            {message.images.map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={img}
                alt={`Attachment ${i + 1}`}
                className="rounded max-h-[100px] object-cover"
              />
            ))}
          </div>
        )}
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div
            className="prose prose-sm prose-invert max-w-none break-words"
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(message.content),
            }}
          />
        )}
      </div>
    </div>
  );
}

export function VibeCodeMessages() {
  const { messages, agentStage, isStreaming } = useVibeCode();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, agentStage]);

  return (
    <div className="flex-1 overflow-y-auto px-3 py-4">
      {messages.length === 0 && (
        <div className="text-center text-muted-foreground text-sm mt-8">
          <p>Start a conversation to modify your app.</p>
          <p className="mt-1 text-xs">
            Use Plan mode to brainstorm or Edit mode to make changes.
          </p>
        </div>
      )}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {isStreaming && agentStage && (
        <div className="mt-2">
          <AgentProgressIndicator
            stage={agentStage}
            isVisible={true}
            startTime={Date.now()}
          />
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
