"use client";

import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import { cn } from "@/lib/utils";
import { ExternalLink, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { toast } from "sonner";

interface StreamingAppProps {
  path: string[];
  className?: string;
}

import type { StreamEvent } from "@/lib/create/types";

interface BuildMessage {
  text: string;
  type: "status" | "phase" | "error" | "fix" | "learning" | "agent";
}

const PHASE_PROGRESS: Record<string, number> = {
  PLANNING: 10,
  GENERATING: 30,
  TRANSPILING: 60,
  FIXING: 70,
  LEARNING: 80,
  VERIFYING: 85,
  PUBLISHED: 100,
  FAILED: 100,
};

export function StreamingApp({ path, className }: StreamingAppProps) {
  const [messages, setMessages] = useState<BuildMessage[]>([]);
  const [status, setStatus] = useState<"connecting" | "generating" | "complete" | "error">(
    "connecting",
  );
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [iteration, setIteration] = useState<number | null>(null);
  const [agentModel, setAgentModel] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [errorCodespaceUrl, setErrorCodespaceUrl] = useState<string | null>(null);
  const lastEventTime = useRef(Date.now());
  const [connectionWarning, setConnectionWarning] = useState(false);
  const router = useRouter();
  const { redirectToSignIn } = useAuthRedirect();
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasAttemptedGeneration = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const addMessage = useCallback((text: string, type: BuildMessage["type"] = "status") => {
    setMessages((prev) => [...prev, { text, type }]);
  }, []);

  const pathKey = JSON.stringify(path);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stablePath = useMemo(() => path, [pathKey]);

  const startStreaming = useCallback(async () => {
    abortRef.current?.abort();

    setStatus("connecting");
    setMessages([]);
    setError(null);
    setErrorCodespaceUrl(null);
    setCurrentPhase(null);
    setIteration(null);
    hasAttemptedGeneration.current = true;

    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

    try {
      const response = await fetch("/api/create/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: stablePath }),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 401) {
          redirectToSignIn();
          return;
        }
        if (response.status === 429) {
          setStatus("error");
          setError("Rate limit reached. Please try again later or sign in for more.");
          return;
        }
        if (response.status === 202) {
          toast.info("App is already being generated. Waiting...");
          setStatus("generating");
          addMessage("Resuming generation monitoring...");
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = setInterval(() => {
            router.refresh();
          }, 3000);

          setTimeout(() => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          }, 60000);

          return;
        }
        throw new Error(`HTTP error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      setStatus("generating");
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            try {
              const event: StreamEvent = JSON.parse(data);
              lastEventTime.current = Date.now();

              switch (event.type) {
                case "agent":
                  setAgentModel(event.model);
                  addMessage(`Using ${event.name} (${event.model})`, "agent");
                  break;

                case "status":
                  addMessage(event.message);
                  break;

                case "phase":
                  setCurrentPhase(event.phase);
                  setProgress(PHASE_PROGRESS[event.phase] ?? 0);
                  if (event.iteration !== undefined) {
                    setIteration(event.iteration);
                  }
                  addMessage(event.message, "phase");
                  break;

                case "code_generated":
                  addMessage("Code generated successfully", "status");
                  break;

                case "error_detected":
                  addMessage(`Error detected: ${event.error}`, "error");
                  break;

                case "error_fixed":
                  addMessage(`Error fixed (attempt ${event.iteration + 1})`, "fix");
                  break;

                case "learning":
                  addMessage(event.notePreview, "learning");
                  break;

                case "complete":
                  setStatus("complete");
                  setProgress(100);
                  addMessage("Complete! Loading app...");
                  router.refresh();
                  break;

                case "error":
                  setStatus("error");
                  setProgress(100);
                  setError(event.message);
                  if (event.codespaceUrl) {
                    setErrorCodespaceUrl(event.codespaceUrl);
                  }
                  toast.error(`Generation failed: ${event.message}`);
                  break;

                case "heartbeat":
                  setConnectionWarning(false);
                  break;

                case "timeout":
                  setStatus("error");
                  setProgress(100);
                  setError(event.message);
                  if (event.codespaceUrl) {
                    setErrorCodespaceUrl(event.codespaceUrl);
                  }
                  break;
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (err) {
      setStatus("error");
      let message = "Failed to generate app";
      if (err instanceof Error) {
        message = err.name === "AbortError" ? "Request timed out" : err.message;
      }
      setError(message);
      toast.error(message);
    } finally {
      clearTimeout(timeoutId);
    }
  }, [stablePath, router, addMessage, redirectToSignIn]);

  useEffect(() => {
    startStreaming();

    return () => {
      abortRef.current?.abort();
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [startStreaming]);

  useEffect(() => {
    if (status !== "generating") return;

    const staleCheck = setInterval(() => {
      if (Date.now() - lastEventTime.current > 30_000) {
        setConnectionWarning(true);
      }
    }, 5_000);

    return () => clearInterval(staleCheck);
  }, [status]);

  // Error UI
  if (status === "error") {
    return (
      <div className={cn("flex flex-col items-center justify-center min-h-[50vh] p-8", className)}>
        <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-6 max-w-md w-full text-center">
          <h3 className="text-xl font-bold text-destructive mb-2">Generation Failed</h3>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={startStreaming}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
            {errorCodespaceUrl && (
              <a
                href={errorCodespaceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View generated code in codespace
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center justify-center min-h-[80vh] w-full", className)}>
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="relative inline-flex">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
            {status === "generating" && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75">
                </span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Building your app...
          </h1>
          <p className="text-muted-foreground">
            Spike Land AI is crafting a React application based on
            <span className="font-mono bg-muted px-2 py-0.5 rounded mx-1 text-foreground">
              /{path.join("/")}
            </span>
          </p>

          {/* Agent model badge */}
          {agentModel && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 text-xs font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              {agentModel}
            </div>
          )}

          {/* Progress bar */}
          {status === "generating" && (
            <div className="w-full max-w-xs mx-auto">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                {progress}%
              </p>
            </div>
          )}

          {/* Phase indicator */}
          {currentPhase && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 text-sm text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              {currentPhase}
              {iteration !== null && iteration > 0 && (
                <span className="text-xs opacity-70">
                  (attempt {iteration + 1})
                </span>
              )}
            </div>
          )}
        </div>

        <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
          <div className="bg-muted/50 px-4 py-3 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Build Log
          </div>
          <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto font-mono text-sm">
            {messages.length === 0 && (
              <div className="flex items-center gap-2 text-muted-foreground italic">
                <Loader2 className="w-3 h-3 animate-spin" />
                Initializing build environment...
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className="flex items-start gap-3 animate-in fade-in slide-in-from-left-2 duration-300"
              >
                <div
                  className={cn(
                    "mt-1.5 w-1.5 h-1.5 rounded-full shrink-0",
                    msg.type === "error" && "bg-red-500",
                    msg.type === "fix" && "bg-amber-500",
                    msg.type === "learning" && "bg-blue-500",
                    msg.type === "phase" && "bg-purple-500",
                    msg.type === "agent" && "bg-indigo-500",
                    msg.type === "status" && "bg-green-500",
                  )}
                />
                <span
                  className={cn(
                    msg.type === "error" && "text-red-600 dark:text-red-400",
                    msg.type === "fix" && "text-amber-600 dark:text-amber-400",
                    msg.type === "learning" && "text-blue-600 dark:text-blue-400 text-xs",
                  )}
                >
                  {msg.text}
                </span>
              </div>
            ))}
            {connectionWarning && status === "generating" && (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs px-4">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Connection may be lost. Waiting for server...
              </div>
            )}
            {status === "generating" && (
              <div className="flex items-center gap-2 text-muted-foreground animate-pulse pl-4.5">
                <span className="w-1 h-4 bg-primary/50 block" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
