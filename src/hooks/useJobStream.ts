import type { JobStatus, PipelineStage } from "@prisma/client";
import { useCallback, useEffect, useState } from "react";

interface JobStreamData {
  type: "status" | "error" | "connected";
  status?: JobStatus;
  currentStage?: PipelineStage | null;
  enhancedUrl?: string | null;
  enhancedWidth?: number | null;
  enhancedHeight?: number | null;
  errorMessage?: string | null;
  message?: string;
}

interface Job {
  id: string;
  status: JobStatus;
  currentStage: PipelineStage | null;
  enhancedUrl: string | null;
  enhancedWidth: number | null;
  enhancedHeight: number | null;
  errorMessage: string | null;
}

interface UseJobStreamOptions {
  jobId: string | null;
  onComplete?: (job: Job) => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: JobStatus) => void;
}

/**
 * Hook for real-time job status updates via Server-Sent Events
 *
 * Replaces polling with SSE for instant status updates.
 * Automatically reconnects on connection loss.
 */
export function useJobStream({
  jobId,
  onComplete,
  onError,
  onStatusChange,
}: UseJobStreamOptions) {
  const [job, setJob] = useState<Job | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data: JobStreamData = JSON.parse(event.data);

        if (data.type === "connected") {
          setIsConnected(true);
          setConnectionError(null);
          return;
        }

        if (data.type === "error") {
          setConnectionError(data.message || "Unknown error");
          onError?.(data.message || "Unknown error");
          return;
        }

        if (data.type === "status" && data.status && jobId) {
          const jobData: Job = {
            id: jobId,
            status: data.status,
            currentStage: data.currentStage || null,
            enhancedUrl: data.enhancedUrl || null,
            enhancedWidth: data.enhancedWidth || null,
            enhancedHeight: data.enhancedHeight || null,
            errorMessage: data.errorMessage || null,
          };

          setJob(jobData);
          onStatusChange?.(data.status);

          if (data.status === "COMPLETED") {
            onComplete?.(jobData);
          } else if (data.status === "FAILED") {
            onError?.(data.errorMessage || "Enhancement failed");
          }
        }
      } catch (error) {
        console.error("Failed to parse SSE message:", error);
      }
    },
    [jobId, onComplete, onError, onStatusChange],
  );

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setIsConnected(false);
      return;
    }

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connect = () => {
      eventSource = new EventSource(`/api/jobs/${jobId}/stream`);

      eventSource.onopen = () => {
        reconnectAttempts = 0;
        setConnectionError(null);
      };

      eventSource.onmessage = handleMessage;

      eventSource.onerror = () => {
        setIsConnected(false);

        // Don't reconnect if stream was intentionally closed
        if (eventSource?.readyState === EventSource.CLOSED) {
          return;
        }

        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
          reconnectAttempts++;

          reconnectTimeout = setTimeout(() => {
            eventSource?.close();
            connect();
          }, delay);
        } else {
          setConnectionError("Connection lost. Please refresh the page.");
          onError?.("Connection lost");
        }
      };
    };

    connect();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      eventSource?.close();
      setIsConnected(false);
    };
  }, [jobId, handleMessage, onError]);

  return {
    job,
    isConnected,
    connectionError,
  };
}
