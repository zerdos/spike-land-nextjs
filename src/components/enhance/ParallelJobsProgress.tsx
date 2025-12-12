"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, Clock, Loader2, RefreshCw, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type EnhancementTier = "TIER_1K" | "TIER_2K" | "TIER_4K";
type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

interface JobProgress {
  jobId: string;
  tier: EnhancementTier;
  status: JobStatus;
  enhancedUrl?: string;
  error?: string;
}

interface ParallelJobsProgressProps {
  jobs: JobProgress[];
  onViewResult?: (jobId: string) => void;
  onRetry?: (tier: EnhancementTier) => void;
  className?: string;
}

const TIER_CONFIG = {
  TIER_1K: {
    label: "1K",
    badgeClass: "bg-green-500/20 text-green-400 border-green-500/30",
    iconClass: "text-green-400",
  },
  TIER_2K: {
    label: "2K",
    badgeClass: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    iconClass: "text-cyan-400",
  },
  TIER_4K: {
    label: "4K",
    badgeClass: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    iconClass: "text-purple-400",
  },
} as const;

function StatusIcon({ status, tier }: { status: JobStatus; tier: EnhancementTier; }) {
  const config = TIER_CONFIG[tier];

  switch (status) {
    case "PENDING":
      return (
        <Clock
          className="h-4 w-4 text-muted-foreground"
          data-testid={`status-icon-pending-${tier}`}
        />
      );
    case "PROCESSING":
      return (
        <Loader2
          className={cn("h-4 w-4 animate-spin", config.iconClass)}
          data-testid={`status-icon-processing-${tier}`}
        />
      );
    case "COMPLETED":
      return (
        <Check className="h-4 w-4 text-green-500" data-testid={`status-icon-completed-${tier}`} />
      );
    case "FAILED":
      return <X className="h-4 w-4 text-destructive" data-testid={`status-icon-failed-${tier}`} />;
  }
}

function JobCard({
  job,
  onViewResult,
  onRetry,
  isExpanded,
}: {
  job: JobProgress;
  onViewResult?: (jobId: string) => void;
  onRetry?: (tier: EnhancementTier) => void;
  isExpanded: boolean;
}) {
  const config = TIER_CONFIG[job.tier];

  return (
    <Card
      className={cn(
        "flex-1 min-w-[140px] transition-all",
        job.status === "FAILED" && "border-destructive/50",
        job.status === "COMPLETED" && "border-green-500/30",
      )}
      data-testid={`job-card-${job.tier}`}
    >
      <CardContent className="p-3 space-y-2">
        {/* Header with badge and status */}
        <div className="flex items-center justify-between gap-2">
          <Badge
            className={cn("text-xs font-semibold", config.badgeClass)}
            data-testid={`tier-badge-${job.tier}`}
          >
            {config.label}
          </Badge>
          <StatusIcon status={job.status} tier={job.tier} />
        </div>

        {/* Thumbnail preview when completed */}
        {job.status === "COMPLETED" && job.enhancedUrl && isExpanded && (
          <button
            type="button"
            className="relative w-full aspect-video rounded-md overflow-hidden bg-muted cursor-pointer hover:ring-2 hover:ring-primary transition-all"
            onClick={() => onViewResult?.(job.jobId)}
            data-testid={`job-thumbnail-${job.tier}`}
          >
            <Image
              src={job.enhancedUrl}
              alt={`${config.label} enhanced`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 200px"
            />
          </button>
        )}

        {/* Completed view button (compact mode) */}
        {job.status === "COMPLETED" && !isExpanded && onViewResult && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs"
            onClick={() => onViewResult(job.jobId)}
            data-testid={`view-result-${job.tier}`}
          >
            View
          </Button>
        )}

        {/* Error message */}
        {job.status === "FAILED" && job.error && (
          <p
            className="text-xs text-destructive truncate"
            title={job.error}
            data-testid={`error-message-${job.tier}`}
          >
            {job.error}
          </p>
        )}

        {/* Retry button */}
        {job.status === "FAILED" && onRetry && (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 text-xs"
            onClick={() => onRetry(job.tier)}
            data-testid={`retry-button-${job.tier}`}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}

        {/* Processing indicator text */}
        {job.status === "PROCESSING" && (
          <p
            className="text-xs text-muted-foreground text-center"
            data-testid={`processing-text-${job.tier}`}
          >
            Processing...
          </p>
        )}

        {/* Pending indicator text */}
        {job.status === "PENDING" && (
          <p
            className="text-xs text-muted-foreground text-center"
            data-testid={`pending-text-${job.tier}`}
          >
            Queued
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function ParallelJobsProgress(
  { jobs, onViewResult, onRetry, className }: ParallelJobsProgressProps,
) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (jobs.length === 0) {
    return null;
  }

  // Sort jobs by tier order: 1K, 2K, 4K
  const sortedJobs = [...jobs].sort((a, b) => {
    const order: Record<EnhancementTier, number> = { TIER_1K: 0, TIER_2K: 1, TIER_4K: 2 };
    return order[a.tier] - order[b.tier];
  });

  const completedCount = jobs.filter((j) => j.status === "COMPLETED").length;
  const failedCount = jobs.filter((j) => j.status === "FAILED").length;
  const processingCount = jobs.filter((j) => j.status === "PROCESSING").length;

  return (
    <div className={cn("space-y-3", className)} data-testid="parallel-jobs-progress">
      {/* Progress summary header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">Enhancement Progress</h3>
          <span className="text-xs text-muted-foreground" data-testid="progress-summary">
            {completedCount}/{jobs.length} completed
            {failedCount > 0 && `, ${failedCount} failed`}
            {processingCount > 0 && `, ${processingCount} processing`}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setIsExpanded(!isExpanded)}
          data-testid="toggle-view-button"
        >
          {isExpanded ? "Compact" : "Expanded"}
        </Button>
      </div>

      {/* Job cards row */}
      <div className="flex gap-2 flex-wrap md:flex-nowrap" data-testid="job-cards-container">
        {sortedJobs.map((job) => (
          <JobCard
            key={job.jobId}
            job={job}
            onViewResult={onViewResult}
            onRetry={onRetry}
            isExpanded={isExpanded}
          />
        ))}
      </div>
    </div>
  );
}
