"use client";

import { SignInButton } from "@/components/auth/sign-in-button";
import { cn } from "@/lib/utils";
import { ExternalLink, Loader2, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface StreamingAppProps {
  path: string[];
  className?: string;
}

import type { StreamEvent } from "@/lib/create/types";

export function StreamingApp({ path, className }: StreamingAppProps) {
  const [messages, setMessages] = useState<string[]>([]);
  const [status, setStatus] = useState<"connecting" | "generating" | "complete" | "error">(
    "connecting",
  );
  const [error, setError] = useState<string | null>(null);
  const [errorCodespaceUrl, setErrorCodespaceUrl] = useState<string | null>(null);
  const [isAuthError, setIsAuthError] = useState(false);
  const router = useRouter();
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasAttemptedGeneration = useRef(false);

  const startStreaming = useCallback(async () => {
    setStatus("connecting");
    setMessages([]);
    setError(null);
    setErrorCodespaceUrl(null);
    setIsAuthError(false);
    hasAttemptedGeneration.current = true;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

    try {
      const response = await fetch("/api/create/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 401) {
          setStatus("error");
          setIsAuthError(true);
          setError("Sign in to generate apps for free");
          return;
        }
        if (response.status === 202) {
          // Already generating, wait a bit then refresh
          toast.info("App is already being generated. Waiting...");
          setStatus("generating");
          setMessages(["Resuming generation monitoring..."]);
          // Poll every 3 seconds
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = setInterval(() => {
            router.refresh();
          }, 3000);

          // Clear interval after 60s
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

              if (event.type === "status") {
                setMessages((prev) => [...prev, event.message]);
              } else if (event.type === "complete") {
                setStatus("complete");
                setMessages((prev) => [...prev, "Complete! Loading app..."]);
                // Refresh to show the published state
                router.refresh();
              } else if (event.type === "error") {
                setStatus("error");
                setError(event.message);
                if (event.codespaceUrl) {
                  setErrorCodespaceUrl(event.codespaceUrl);
                }
                toast.error(`Generation failed: ${event.message}`);
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
  }, [path, router]);

  useEffect(() => {
    // Only start if we are mounted
    startStreaming();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [startStreaming]);

  // Auth error UI with sign in button
  if (status === "error" && isAuthError) {
    const callbackUrl = `/create/${path.join("/")}`;
    return (
      <div className={cn("flex flex-col items-center justify-center min-h-[50vh] p-8", className)}>
        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-indigo-500/30 rounded-2xl p-8 max-w-md w-full text-center shadow-lg">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/25">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-3">Sign in to continue</h3>
          <p className="text-muted-foreground mb-2">
            App generation is <span className="font-semibold text-indigo-400">completely free</span>
            {" "}
            for logged-in users.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Create unlimited apps with AI-powered generation.
          </p>
          <SignInButton
            callbackUrl={callbackUrl}
            className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25 text-base font-medium"
          >
            <LogIn className="mr-2 h-5 w-5" />
            Sign In to Generate
          </SignInButton>
        </div>
      </div>
    );
  }

  // Generic error UI
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
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                <span>{msg}</span>
              </div>
            ))}
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
