"use client";

import { useCallback, useState, useRef } from "react";
import { tokenManager } from "../token-manager";

export interface UseMcpStreamOptions {
  onChunk?: (chunk: string) => void;
  onDone?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

export function useMcpStream(
  name: string,
  options: UseMcpStreamOptions = {},
) {
  const [chunks, setChunks] = useState<string[]>([]);
  const [fullText, setFullText] = useState("");
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<Error | undefined>();
  const eventSourceRef = useRef<EventSource | null>(null);

  const start = useCallback(async (args: unknown = {}) => {
    // Reset state
    setChunks([]);
    setFullText("");
    setIsDone(false);
    setError(undefined);

    const token = await tokenManager.getToken();
    if (!token) {
      const err = new Error("Unauthorized");
      setError(err);
      options.onError?.(err);
      return;
    }

    const url = new URL("/api/mcp", window.location.origin);
    url.searchParams.set("method", "tools/call");
    url.searchParams.set("name", name);
    url.searchParams.set("arguments", JSON.stringify(args));
    url.searchParams.set("token", token);
    url.searchParams.set("stream", "true");

    const es = new EventSource(url.toString());
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as {
          result?: { content?: Array<{ type: string; text?: string; }>; };
          isDone?: boolean;
        };
        
        // Handle MCP result content
        if (data.result?.content) {
          const text = data.result.content
            .filter((c) => c.type === "text")
            .map((c) => c.text)
            .join("");
          
          if (text) {
            setChunks((prev) => [...prev, text]);
            setFullText((prev) => {
              const newFull = prev + text;
              options.onChunk?.(text);
              return newFull;
            });
          }
        }

        // Check for end of stream (standard MCP servers might not have a clear EOF in the tool call result,
        // but our implementation should send a specific message or close the connection)
        if (data.isDone) {
          es.close();
          setIsDone(true);
          setFullText((prev) => {
            options.onDone?.(prev);
            return prev;
          });
        }
      } catch (err) {
        console.error("Error parsing SSE message:", err);
      }
    };

    es.onerror = (err) => {
      console.error("SSE error:", err);
      es.close();
      const error = new Error("Stream connection failed");
      setError(error);
      options.onError?.(error);
    };

    return () => es.close();
  }, [name, options]);

  const stop = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      setIsDone(true);
    }
  }, []);

  return {
    chunks,
    fullText,
    isDone,
    error,
    start,
    stop,
  };
}
