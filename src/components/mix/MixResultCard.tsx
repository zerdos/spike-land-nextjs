"use client";

import { PipelineProgress } from "@/components/enhance/PipelineProgress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useJobStream } from "@/hooks/useJobStream";
import { cn } from "@/lib/utils";
import type { JobStatus, PipelineStage } from "@prisma/client";
import { AlertCircle, Download, Layers, RefreshCw } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

export interface MixResult {
  jobId: string;
  resultUrl: string;
  width: number;
  height: number;
}

interface MixResultCardProps {
  activeJobId: string | null;
  hasImages: boolean;
  onComplete?: (result: MixResult) => void;
  onError?: (error: string) => void;
  onRetry?: () => void;
}

type MixState =
  | { type: "empty"; }
  | { type: "processing"; stage: PipelineStage | null; }
  | { type: "completed"; result: MixResult; }
  | { type: "failed"; error: string; };

export function MixResultCard({
  activeJobId,
  hasImages,
  onComplete,
  onError,
  onRetry,
}: MixResultCardProps) {
  const [state, setState] = useState<MixState>({ type: "empty" });

  const handleJobComplete = useCallback(
    (job: {
      id: string;
      status: JobStatus;
      currentStage: PipelineStage | null;
      enhancedUrl: string | null;
      enhancedWidth: number | null;
      enhancedHeight: number | null;
    }) => {
      if (job.enhancedUrl) {
        const result: MixResult = {
          jobId: job.id,
          resultUrl: job.enhancedUrl,
          width: job.enhancedWidth || 1024,
          height: job.enhancedHeight || 1024,
        };
        setState({ type: "completed", result });
        onComplete?.(result);
      }
    },
    [onComplete],
  );

  const handleJobError = useCallback(
    (error: string) => {
      setState({ type: "failed", error });
      onError?.(error);
    },
    [onError],
  );

  const { job } = useJobStream({
    jobId: activeJobId,
    onComplete: handleJobComplete,
    onError: handleJobError,
  });

  // Update state when job changes
  useEffect(() => {
    if (!activeJobId) {
      // Only reset to empty if we're not in completed state
      setState((prev) => prev.type === "completed" ? prev : { type: "empty" });
      return;
    }

    if (job) {
      if (job.status === "PROCESSING" || job.status === "PENDING") {
        setState({ type: "processing", stage: job.currentStage });
      } else if (job.status === "COMPLETED" && job.enhancedUrl) {
        setState({
          type: "completed",
          result: {
            jobId: job.id,
            resultUrl: job.enhancedUrl,
            width: job.enhancedWidth || 1024,
            height: job.enhancedHeight || 1024,
          },
        });
      } else if (job.status === "FAILED") {
        setState({
          type: "failed",
          error: job.errorMessage || "Mix failed",
        });
      }
    } else {
      // Job ID is set but job data not yet received
      setState({ type: "processing", stage: null });
    }
  }, [activeJobId, job]);

  const handleDownload = useCallback(async () => {
    if (state.type !== "completed") return;

    try {
      const response = await fetch(state.result.resultUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mix-${state.result.jobId}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to download:", error);
    }
  }, [state]);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Generated Mix</p>
      <Card
        className={cn(
          "relative overflow-hidden",
          "aspect-square",
        )}
      >
        {state.type === "empty" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
              <Layers className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                {hasImages ? "Ready to mix" : "Select two images"}
              </p>
              <p className="text-xs text-muted-foreground/70">
                {hasImages
                  ? "Click 'Create Mix' to blend images"
                  : "Choose input photos to start"}
              </p>
            </div>
          </div>
        )}

        {state.type === "processing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
            <div className="space-y-2 text-center">
              <p className="text-sm font-medium">Mixing...</p>
              <PipelineProgress
                currentStage={state.stage}
                className="justify-center"
              />
            </div>
          </div>
        )}

        {state.type === "completed" && (
          <>
            <Image
              src={state.result.resultUrl}
              alt="Mix result"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
            />
            {/* Action buttons overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleDownload}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          </>
        )}

        {state.type === "failed" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4 text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-destructive">
                Mix failed
              </p>
              <p className="text-xs text-muted-foreground">
                {state.error}
              </p>
              {onRetry && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRetry}
                  className="mt-2"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
