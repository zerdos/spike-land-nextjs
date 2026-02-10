"use client";

import { useEffect } from "react";

const ALLOWED_ORIGINS = [
  "https://testing.spike.land",
  "http://localhost:3000",
  "http://localhost:5173",
];

interface CodeEditorErrorMessage {
  type: "code-editor-error";
  payload: {
    message: string;
    stack?: string;
    componentStack?: string;
  };
}

function isCodeEditorError(data: unknown): data is CodeEditorErrorMessage {
  return (
    typeof data === "object"
    && data !== null
    && "type" in data
    && (data as { type: string }).type === "code-editor-error"
    && "payload" in data
  );
}

function reportCodeEditorError(payload: CodeEditorErrorMessage["payload"]): void {
  try {
    const body = {
      errors: [
        {
          message: `[CodeEditor] ${payload.message}`,
          stack: payload.stack,
          errorType: "CodeEditorError",
          route: window.location.pathname,
          timestamp: new Date().toISOString(),
          environment: "FRONTEND" as const,
          metadata: {
            source: "iframe-bridge",
            componentStack: payload.componentStack,
          },
        },
      ],
    };
    navigator.sendBeacon(
      "/api/errors/report",
      new Blob([JSON.stringify(body)], { type: "application/json" }),
    );
  } catch {
    // Silently fail
  }
}

export function IframeErrorBridge(): null {
  useEffect(() => {
    function handleMessage(event: MessageEvent): void {
      // Validate origin
      if (!ALLOWED_ORIGINS.includes(event.origin) && event.origin !== window.location.origin) {
        return;
      }

      if (isCodeEditorError(event.data)) {
        reportCodeEditorError(event.data.payload);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}
