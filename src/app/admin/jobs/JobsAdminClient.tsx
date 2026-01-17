/**
 * Jobs Admin Client Component
 *
 * Client-side component for the admin jobs management page.
 * Features:
 * - Tab filtering by job status and type
 * - Job list with pagination
 * - Job detail panel with before/after comparison
 * - Processing time and metadata display
 * - Job actions: Kill, Rerun, Copy Link
 * - Direct link support via initialJobId
 */

"use client";

import { ImageComparisonSlider } from "@/components/enhance/ImageComparisonSlider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { JobSource, UnifiedJob } from "@/types/admin-jobs";
import type { EnhancementTier, JobStatus } from "@prisma/client";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

// Unified Job type from API
type Job = UnifiedJob;

interface JobsResponse {
  jobs: Job[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  statusCounts: Record<string, number>;
  typeCounts: {
    all: number;
    enhancement: number;
    mcp: number;
  };
}

interface JobsAdminClientProps {
  initialJobId?: string;
}

const STATUS_TABS: Array<
  { key: string; label: string; status: JobStatus | null; }
> = [
  { key: "ALL", label: "All", status: null },
  { key: "PENDING", label: "Queue", status: "PENDING" },
  { key: "PROCESSING", label: "Running", status: "PROCESSING" },
  { key: "COMPLETED", label: "Completed", status: "COMPLETED" },
  { key: "FAILED", label: "Failed", status: "FAILED" },
  { key: "CANCELLED", label: "Cancelled", status: "CANCELLED" },
  { key: "REFUNDED", label: "Refunded", status: "REFUNDED" },
];

const TYPE_TABS: Array<{ key: JobSource | "all"; label: string; }> = [
  { key: "all", label: "All Types" },
  { key: "enhancement", label: "Enhancement" },
  { key: "mcp", label: "MCP Generation" },
];

const SOURCE_COLORS: Record<JobSource, string> = {
  enhancement: "bg-indigo-100 text-indigo-800 border-indigo-200",
  mcp: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const STATUS_COLORS: Record<JobStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  PROCESSING: "bg-blue-100 text-blue-800 border-blue-200 animate-pulse",
  COMPLETED: "bg-green-100 text-green-800 border-green-200",
  FAILED: "bg-red-100 text-red-800 border-red-200",
  CANCELLED: "bg-neutral-100 text-neutral-800 border-neutral-200",
  REFUNDED: "bg-purple-100 text-purple-800 border-purple-200",
};

const TIER_LABELS: Record<EnhancementTier, string> = {
  FREE: "Free",
  TIER_1K: "1K",
  TIER_2K: "2K",
  TIER_4K: "4K",
};

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "N/A";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDuration(
  startTime: string | null,
  endTime: string | null,
): string {
  if (!startTime || !endTime) return "N/A";
  const durationMs = new Date(endTime).getTime() -
    new Date(startTime).getTime();
  if (durationMs < 1000) return `${durationMs}ms`;
  if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
  const minutes = Math.floor(durationMs / 60000);
  const seconds = ((durationMs % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatAbsoluteTime(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

export function JobsAdminClient({ initialJobId }: JobsAdminClientProps) {
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [activeType, setActiveType] = useState<JobSource | "all">("all");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<
    {
      type: "success" | "error";
      text: string;
    } | null
  >(null);

  // Modify & Run dialog state
  const [showModifyDialog, setShowModifyDialog] = useState(false);
  const [modifiedPrompt, setModifiedPrompt] = useState("");
  const [modifyTier, setModifyTier] = useState<EnhancementTier>("TIER_1K");

  // Timeline Helper Component
  const JobTimeline = ({ job }: { job: Job; }) => {
    const created = new Date(job.createdAt).getTime();
    const started = job.processingStartedAt
      ? new Date(job.processingStartedAt).getTime()
      : null;
    const completed = job.processingCompletedAt
      ? new Date(job.processingCompletedAt).getTime()
      : null;
    const now = Date.now();

    const queueDuration = started ? started - created : now - created;
    const processDuration = started
      ? (completed ? completed - started : now - started)
      : 0;
    const totalDuration = queueDuration + processDuration;

    const queuePercent = (queueDuration / totalDuration) * 100;
    const processPercent = (processDuration / totalDuration) * 100;

    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-500">Timeline</h3>
        <div className="flex h-4 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
          <div
            className="flex items-center justify-center bg-yellow-200 text-[10px] text-yellow-800"
            style={{ width: `${queuePercent}%` }}
            title={`Queued: ${
              formatDuration(
                job.createdAt,
                job.processingStartedAt || new Date().toISOString(),
              )
            }`}
          >
            {queuePercent > 10 && "Queue"}
          </div>
          {started && (
            <div
              className={`flex items-center justify-center text-[10px] ${
                job.status === "FAILED"
                  ? "bg-red-200 text-red-800"
                  : job.status === "COMPLETED"
                  ? "bg-green-200 text-green-800"
                  : "animate-pulse bg-blue-200 text-blue-800"
              }`}
              style={{ width: `${processPercent}%` }}
              title={`Processing: ${
                formatDuration(
                  job.processingStartedAt,
                  job.processingCompletedAt || new Date().toISOString(),
                )
              }`}
            >
              {processPercent > 10 && "Process"}
            </div>
          )}
        </div>
        <div className="flex justify-between text-xs text-neutral-500">
          <span>Created: {formatAbsoluteTime(job.createdAt)}</span>
          {started && <span>Started: {formatAbsoluteTime(job.processingStartedAt!)}</span>}
          {completed && (
            <span>
              Completed: {formatAbsoluteTime(job.processingCompletedAt!)}
            </span>
          )}
        </div>
      </div>
    );
  };

  const fetchJobs = useCallback(
    async ( // Note: This function is memoized and stable
      status: JobStatus | null,
      type: JobSource | "all",
      page: number,
      search: string,
    ) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (status) params.set("status", status);
        if (type !== "all") params.set("type", type);
        params.set("page", page.toString());
        params.set("limit", "20");
        if (search) params.set("search", search);

        const response = await fetch(`/api/admin/jobs?${params.toString()}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch jobs");
        }

        const data: JobsResponse = await response.json();
        setJobs(data.jobs);
        setPagination(data.pagination);
        setStatusCounts(data.statusCounts);
        setTypeCounts(data.typeCounts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [], // All dependencies are state setters, which are stable.
  );

  // Fetch specific job by ID (for initial load with jobId)
  const fetchJobById = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/admin/jobs/${jobId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedJob(data.job);
      }
    } catch (err) {
      console.error("Failed to fetch job by ID:", err);
    }
  }, []);

  // Kill job action
  const handleKillJob = useCallback(async (jobId: string) => {
    setActionLoading(jobId);
    setActionMessage(null);
    try {
      const response = await fetch(`/api/admin/jobs/${jobId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel job");
      }

      setActionMessage({
        type: "success",
        text: `Job cancelled. ${data.tokensRefunded} tokens refunded.`,
      });

      // Refresh jobs list
      const status = STATUS_TABS.find((t) => t.key === activeTab)?.status ??
        null;
      fetchJobs(status, activeType, pagination.page, searchQuery);
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to cancel job",
      });
    } finally {
      setActionLoading(null);
    }
  }, [activeTab, activeType, fetchJobs, pagination.page, searchQuery]);

  // Rerun job action
  const handleRerunJob = useCallback(async (jobId: string) => {
    setActionLoading(jobId);
    setActionMessage(null);
    try {
      const response = await fetch(`/api/admin/jobs/${jobId}/rerun`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to rerun job");
      }

      setActionMessage({
        type: "success",
        text: `Job rerun started. New job ID: ${data.newJobId}`,
      });

      // Refresh jobs list
      const status = STATUS_TABS.find((t) => t.key === activeTab)?.status ??
        null;
      fetchJobs(status, activeType, pagination.page, searchQuery);
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to rerun job",
      });
    } finally {
      setActionLoading(null);
    }
  }, [activeTab, activeType, fetchJobs, pagination.page, searchQuery]);

  // Copy link action
  const handleCopyLink = useCallback((jobId: string) => {
    const url = `${window.location.origin}/admin/jobs/${jobId}`;
    navigator.clipboard.writeText(url);
    setActionMessage({ type: "success", text: "Link copied to clipboard!" });
    setTimeout(() => setActionMessage(null), 2000);
  }, []);

  // Modify & Run action - create new job with modified prompt
  const handleModifyAndRun = useCallback(async () => {
    if (!selectedJob || !modifiedPrompt.trim()) return;

    setActionLoading("modify");
    setActionMessage(null);

    try {
      const isModifyJob = selectedJob.mcpJobType === "MODIFY";
      const endpoint = isModifyJob ? "/api/mcp/modify" : "/api/mcp/generate";

      const body = isModifyJob
        ? {
          prompt: modifiedPrompt.trim(),
          tier: modifyTier,
          imageUrl: selectedJob.inputUrl, // Use original input image
        }
        : {
          prompt: modifiedPrompt.trim(),
          tier: modifyTier,
        };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create job");
      }

      setActionMessage({
        type: "success",
        text: `New job created: ${data.jobId}`,
      });
      setShowModifyDialog(false);

      // Refresh jobs list
      const status = STATUS_TABS.find((t) => t.key === activeTab)?.status ??
        null;
      fetchJobs(status, activeType, pagination.page, searchQuery);
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to create job",
      });
    } finally {
      setActionLoading(null);
    }
  }, [
    selectedJob,
    modifiedPrompt,
    modifyTier,
    activeTab,
    activeType,
    fetchJobs,
    pagination.page,
    searchQuery,
  ]);

  // Update URL when job is selected
  const selectJob = useCallback((job: Job | null) => {
    setSelectedJob(job);
    if (job) {
      const url = new URL(window.location.href);
      url.searchParams.set("jobId", job.id);
      window.history.replaceState({}, "", url.toString());
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete("jobId");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  // Load initial job if provided
  useEffect(() => {
    if (initialJobId) {
      fetchJobById(initialJobId);
    }
  }, [initialJobId, fetchJobById]);

  // When the list of jobs changes, check if the currently selected job still exists in the new list.
  // If not, deselect it. This prevents a stale job detail view.
  useEffect(() => {
    if (selectedJob && !jobs.find((j) => j.id === selectedJob.id)) {
      setSelectedJob(null);
    }
  }, [jobs, selectedJob]);

  // Main data fetching effect.
  // Refetches jobs when filters (tab, type), pagination, or search query change.
  useEffect(() => {
    const status = STATUS_TABS.find((t) => t.key === activeTab)?.status ?? null;
    fetchJobs(status, activeType, pagination.page, searchQuery);
  }, [activeTab, activeType, pagination.page, fetchJobs, searchQuery]);

  const handleSearch = () => {
    setPagination((p) => ({ ...p, page: 1 }));
    const status = STATUS_TABS.find((t) => t.key === activeTab)?.status ?? null;
    fetchJobs(status, activeType, 1, searchQuery);
  };

  const handleRefresh = () => {
    const status = STATUS_TABS.find((t) => t.key === activeTab)?.status ?? null;
    fetchJobs(status, activeType, pagination.page, searchQuery);
  };

  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey);
    setPagination((p) => ({ ...p, page: 1 }));
    selectJob(null);
  };

  const handleTypeChange = (typeKey: JobSource | "all") => {
    setActiveType(typeKey);
    setPagination((p) => ({ ...p, page: 1 }));
    selectJob(null);
  };

  // Check if job can be killed
  const canKillJob = (job: Job) => job.status === "PENDING" || job.status === "PROCESSING";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Jobs Management</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          View and manage all enhancement jobs
        </p>
      </div>

      {/* Type Tabs */}
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm font-medium text-neutral-500">Type:</span>
        <div className="flex gap-2">
          {TYPE_TABS.map((tab) => (
            <Button
              key={tab.key}
              variant={activeType === tab.key ? "default" : "outline"}
              size="sm"
              onClick={() => handleTypeChange(tab.key)}
              className="gap-2"
            >
              {tab.label}
              <Badge variant="secondary" className="ml-1">
                {Object.keys(typeCounts).length === 0
                  ? "..."
                  : (typeCounts[tab.key] ?? 0)}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "default" : "outline"}
            size="sm"
            onClick={() => handleTabChange(tab.key)}
            className="gap-2"
          >
            {tab.label}
            <Badge variant="secondary" className="ml-1">
              {Object.keys(statusCounts).length === 0
                ? "..."
                : (statusCounts[tab.key] ?? 0)}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Action Message */}
      {actionMessage && (
        <Card
          className={`p-3 ${
            actionMessage.type === "success"
              ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
              : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
          }`}
        >
          <p
            className={actionMessage.type === "success"
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"}
          >
            {actionMessage.text}
          </p>
        </Card>
      )}

      {/* Search and Refresh */}
      <div className="flex gap-2" role="search">
        <Input
          type="text"
          placeholder="Search by Job ID or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1"
          aria-label="Search by Job ID or email"
        />
        <Button variant="outline" onClick={handleSearch} aria-label="Search">
          Search
        </Button>
        <Button
          variant="outline"
          onClick={handleRefresh}
          aria-label="Refresh job list"
        >
          Refresh
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Job List */}
        <Card className="p-4">
          <h2 className="mb-4 text-lg font-semibold">
            Jobs ({pagination.total})
          </h2>
          {loading
            ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800"
                  />
                ))}
              </div>
            )
            : jobs.length === 0
            ? (
              <p className="text-neutral-500" data-testid="empty-jobs-message">
                No jobs found
              </p>
            )
            : (
              <div className="max-h-[600px] space-y-2 overflow-y-auto">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    data-testid="job-list-item"
                    data-job-status={job.status}
                    onClick={() => selectJob(job)}
                    className={`cursor-pointer rounded-md border p-3 transition-colors hover:bg-neutral-800 ${
                      selectedJob?.id === job.id
                        ? "border-blue-500 bg-blue-900/20"
                        : "border-neutral-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={SOURCE_COLORS[job.source]}>
                          {job.source === "mcp" ? "MCP" : "ENH"}
                        </Badge>
                        <Badge className={STATUS_COLORS[job.status]}>
                          {job.status}
                        </Badge>
                        <span className="text-sm font-medium">
                          {TIER_LABELS[job.tier]}
                        </span>
                      </div>
                      <span className="text-xs text-neutral-500">
                        {formatRelativeTime(job.createdAt)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                      <span className="font-mono">
                        {job.id.slice(0, 12)}...
                      </span>
                      {" | "}
                      {job.userEmail}
                    </div>
                    {job.status === "PROCESSING" && job.currentStage && (
                      <div className="mt-1 text-xs text-blue-500">
                        Stage: {job.currentStage}
                      </div>
                    )}
                    {job.status === "COMPLETED" && (
                      <div className="mt-1 text-xs text-green-600">
                        {formatDuration(
                          job.processingStartedAt,
                          job.processingCompletedAt,
                        )}
                      </div>
                    )}
                    {job.status === "FAILED" && job.errorMessage && (
                      <div className="mt-1 truncate text-xs text-red-600">
                        {job.errorMessage}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              >
                Previous
              </Button>
              <span className="text-sm text-neutral-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              >
                Next
              </Button>
            </div>
          )}
        </Card>

        {/* Job Details */}
        <Card className="p-4">
          <h2 className="mb-4 text-lg font-semibold">Job Details</h2>
          {!selectedJob
            ? <p className="text-neutral-500">Select a job to view details</p>
            : (
              <div className="space-y-4">
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyLink(selectedJob.id)}
                    disabled={actionLoading === selectedJob.id}
                    data-testid="job-copy-link-button"
                  >
                    Copy Link
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRerunJob(selectedJob.id)}
                    disabled={actionLoading === selectedJob.id}
                  >
                    {actionLoading === selectedJob.id ? "..." : "Rerun"}
                  </Button>
                  {canKillJob(selectedJob) && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleKillJob(selectedJob.id)}
                      disabled={actionLoading === selectedJob.id}
                      data-testid="job-kill-button"
                    >
                      {actionLoading === selectedJob.id ? "..." : "Kill Job"}
                    </Button>
                  )}
                  {selectedJob.source === "mcp" && selectedJob.prompt && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setModifiedPrompt(selectedJob.prompt || "");
                        setModifyTier(selectedJob.tier);
                        setShowModifyDialog(true);
                      }}
                      disabled={actionLoading === "modify"}
                    >
                      Modify & Run
                    </Button>
                  )}
                </div>

                {/* Before/After Comparison for Completed Jobs with both URLs */}
                {selectedJob.status === "COMPLETED" &&
                  selectedJob.outputUrl &&
                  selectedJob.inputUrl && (
                  <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <ImageComparisonSlider
                      originalUrl={selectedJob.inputUrl}
                      enhancedUrl={selectedJob.outputUrl}
                      originalLabel="Original"
                      enhancedLabel={selectedJob.source === "mcp"
                        ? "Generated"
                        : "Enhanced"}
                      width={selectedJob.outputWidth || 16}
                      height={selectedJob.outputHeight || 9}
                    />
                  </div>
                )}

                {/* Output Only - for GENERATE jobs without input image */}
                {selectedJob.status === "COMPLETED" &&
                  selectedJob.outputUrl &&
                  !selectedJob.inputUrl && (
                  <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <div className="relative aspect-square w-full">
                      <Image
                        src={selectedJob.outputUrl}
                        alt="Generated result"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    <div className="bg-neutral-100 px-3 py-2 text-center text-sm font-medium dark:bg-neutral-800">
                      Generated Output
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <JobTimeline job={selectedJob} />

                {/* Input Images */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-neutral-500">
                    Input Images
                  </h3>
                  <div className="flex gap-4">
                    {/* Original Input */}
                    {selectedJob.inputUrl && (
                      <div className="group relative aspect-square w-32 overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-700">
                        <Image
                          src={selectedJob.inputUrl}
                          alt="Input"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-black/50 p-1 text-center text-[10px] text-white">
                          Original
                        </div>
                      </div>
                    )}
                    {/* Blend Source Input */}
                    {selectedJob.isBlend && selectedJob.sourceImageId && (
                      <div className="group relative aspect-square w-32 overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-700">
                        {/* Note: We'd ideally fetch the blend source URL here. For now assuming we might have it or just showing the ID */}
                        <div className="flex h-full w-full items-center justify-center bg-neutral-100 dark:bg-neutral-800">
                          <span className="text-xs text-neutral-500">
                            Blend Source
                          </span>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 bg-blue-900/50 p-1 text-center text-[10px] text-white">
                          Blend Source
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Final Prompt (Gemini Prompt) */}
                {selectedJob.prompt && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-neutral-500">
                      {selectedJob.source === "mcp"
                        ? "User Prompt"
                        : "Final Prompt"}
                    </h3>
                    <div className="relative rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs font-mono dark:border-neutral-700 dark:bg-neutral-900">
                      <p className="whitespace-pre-wrap">
                        {selectedJob.prompt}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 h-6 w-6"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedJob.prompt!);
                          setActionMessage({
                            type: "success",
                            text: "Prompt copied!",
                          });
                          setTimeout(() => setActionMessage(null), 2000);
                        }}
                      >
                        <span className="sr-only">Copy</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-3 w-3"
                        >
                          <rect
                            width="8"
                            height="4"
                            x="8"
                            y="2"
                            rx="1"
                            ry="1"
                          />
                          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Job Info Grid */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Source & Status */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-neutral-500">
                      Source
                    </h3>
                    <Badge className={SOURCE_COLORS[selectedJob.source]}>
                      {selectedJob.source === "mcp"
                        ? "MCP Generation"
                        : "Enhancement"}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-neutral-500">
                      Status
                    </h3>
                    <Badge className={STATUS_COLORS[selectedJob.status]}>
                      {selectedJob.status}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-neutral-500">
                      Processing Time
                    </h3>
                    <p className="text-sm">
                      {formatDuration(
                        selectedJob.processingStartedAt,
                        selectedJob.processingCompletedAt,
                      )}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-neutral-500">
                      Created
                    </h3>
                    <p className="text-sm">
                      {formatAbsoluteTime(selectedJob.createdAt)}
                    </p>
                  </div>

                  {selectedJob.processingCompletedAt && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-neutral-500">
                        Completed
                      </h3>
                      <p className="text-sm">
                        {formatAbsoluteTime(selectedJob.processingCompletedAt)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Job Details */}
                <div className="border-t border-neutral-200 pt-4 dark:border-neutral-700">
                  <h3 className="mb-2 text-sm font-semibold">Job Details</h3>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Tier</span>
                      <span>
                        {TIER_LABELS[selectedJob.tier]} ({selectedJob.tokensCost} tokens)
                      </span>
                    </div>
                    {selectedJob.source === "mcp" && selectedJob.mcpJobType && (
                      <div className="flex justify-between">
                        <span className="text-neutral-500">MCP Type</span>
                        <span>{selectedJob.mcpJobType}</span>
                      </div>
                    )}
                    {selectedJob.outputUrl && (
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Output</span>
                        <span>
                          {selectedJob.outputWidth}x{selectedJob.outputHeight},{" "}
                          {formatBytes(selectedJob.outputSizeBytes)}
                        </span>
                      </div>
                    )}
                    {selectedJob.retryCount !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Retries</span>
                        <span>
                          {selectedJob.retryCount}/{selectedJob.maxRetries}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Model Details */}
                {selectedJob.geminiModel && (
                  <div className="border-t border-neutral-200 pt-4 dark:border-neutral-700">
                    <h3 className="mb-2 text-sm font-semibold">AI Model</h3>
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Model</span>
                        <span className="font-mono text-xs">
                          {selectedJob.geminiModel}
                        </span>
                      </div>
                      {selectedJob.geminiTemp !== null &&
                        selectedJob.geminiTemp !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Temperature</span>
                          <span>{selectedJob.geminiTemp}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {selectedJob.errorMessage && (
                  <div className="border-t border-neutral-200 pt-4 dark:border-neutral-700">
                    <h3 className="mb-2 text-sm font-semibold text-red-600">
                      Error
                    </h3>
                    <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded-md bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
                      {selectedJob.errorMessage}
                    </pre>
                  </div>
                )}

                {/* User Info */}
                <div className="border-t border-neutral-200 pt-4 dark:border-neutral-700">
                  <h3 className="mb-2 text-sm font-semibold">User</h3>
                  <div className="text-sm">
                    <p>{selectedJob.userName || "Unknown"}</p>
                    <p className="text-neutral-500">{selectedJob.userEmail}</p>
                  </div>
                </div>

                {/* IDs */}
                <div className="border-t border-neutral-200 pt-4 dark:border-neutral-700">
                  <h3 className="mb-2 text-sm font-semibold">IDs</h3>
                  <div className="grid gap-1 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Job</span>
                      <span
                        className="truncate max-w-[180px]"
                        title={selectedJob.id}
                      >
                        {selectedJob.id}
                      </span>
                    </div>
                    {/* Enhancement-specific IDs */}
                    {selectedJob.source === "enhancement" &&
                      selectedJob.imageId && (
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Image</span>
                        <span
                          className="truncate max-w-[180px]"
                          title={selectedJob.imageId}
                        >
                          {selectedJob.imageId}
                        </span>
                      </div>
                    )}
                    {selectedJob.source === "enhancement" &&
                      selectedJob.workflowRunId && (
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Workflow</span>
                        <span
                          className="truncate max-w-[180px]"
                          title={selectedJob.workflowRunId}
                        >
                          {selectedJob.workflowRunId}
                        </span>
                      </div>
                    )}
                    {/* MCP-specific IDs */}
                    {selectedJob.source === "mcp" && selectedJob.apiKeyId && (
                      <div className="flex justify-between">
                        <span className="text-neutral-500">API Key</span>
                        <span>
                          {selectedJob.apiKeyName || selectedJob.apiKeyId}
                        </span>
                      </div>
                    )}
                    {selectedJob.source === "mcp" && selectedJob.inputR2Key && (
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Input R2</span>
                        <span
                          className="truncate max-w-[180px]"
                          title={selectedJob.inputR2Key}
                        >
                          {selectedJob.inputR2Key}
                        </span>
                      </div>
                    )}
                    {selectedJob.source === "mcp" && selectedJob.outputR2Key &&
                      (
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Output R2</span>
                          <span
                            className="truncate max-w-[180px]"
                            title={selectedJob.outputR2Key}
                          >
                            {selectedJob.outputR2Key}
                          </span>
                        </div>
                      )}
                  </div>
                </div>

                {/* Original Image Info (enhancement jobs only) */}
                {selectedJob.source === "enhancement" &&
                  (selectedJob.originalWidth || selectedJob.originalHeight) && (
                  <div className="border-t border-neutral-200 pt-4 dark:border-neutral-700">
                    <h3 className="mb-2 text-sm font-semibold">
                      Original Image
                    </h3>
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Dimensions</span>
                        <span>
                          {selectedJob.originalWidth}x{selectedJob
                            .originalHeight}
                        </span>
                      </div>
                      {selectedJob.originalFormat && (
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Format</span>
                          <span>{selectedJob.originalFormat}</span>
                        </div>
                      )}
                      {selectedJob.originalSizeBytes && (
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Size</span>
                          <span>
                            {formatBytes(selectedJob.originalSizeBytes)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Processing Details (enhancement jobs only) */}
                {selectedJob.source === "enhancement" && (
                  <div className="border-t border-neutral-200 pt-4 dark:border-neutral-700">
                    <h3 className="mb-2 text-sm font-semibold">
                      Processing Details
                    </h3>
                    <div className="grid gap-2 text-sm">
                      {selectedJob.currentStage && (
                        <div className="flex justify-between">
                          <span className="text-neutral-500">
                            Current Stage
                          </span>
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            {selectedJob.currentStage}
                          </Badge>
                        </div>
                      )}
                      {selectedJob.wasCropped !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Auto-Cropped</span>
                          <span>{selectedJob.wasCropped ? "Yes" : "No"}</span>
                        </div>
                      )}
                      {selectedJob.wasCropped && selectedJob.cropDimensions && (
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Crop</span>
                          <span className="text-xs font-mono">
                            {selectedJob.cropDimensions.left},{selectedJob
                              .cropDimensions.top} → {selectedJob.cropDimensions.width}x{selectedJob
                              .cropDimensions.height}
                          </span>
                        </div>
                      )}
                      {selectedJob.isBlend !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Blend Mode</span>
                          <span>{selectedJob.isBlend ? "Yes" : "No"}</span>
                        </div>
                      )}
                      {selectedJob.isBlend && selectedJob.sourceImageUrl && (
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Source Image</span>
                          <a
                            href={selectedJob.sourceImageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            View Source
                          </a>
                        </div>
                      )}
                      {selectedJob.pipelineId && (
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Pipeline</span>
                          <span
                            className="font-mono text-xs truncate max-w-[150px]"
                            title={selectedJob.pipelineId}
                          >
                            {selectedJob.pipelineId}
                          </span>
                        </div>
                      )}
                      {selectedJob.isAnonymous !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Anonymous</span>
                          <span>{selectedJob.isAnonymous ? "Yes" : "No"}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Analysis Results (enhancement jobs only) */}
                {selectedJob.source === "enhancement" &&
                  selectedJob.analysisResult && (
                  <div className="border-t border-neutral-200 pt-4 dark:border-neutral-700">
                    <h3 className="mb-2 text-sm font-semibold">AI Analysis</h3>
                    <div className="space-y-3">
                      {selectedJob.analysisSource && (
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-500">Model</span>
                          <span className="font-mono text-xs">
                            {selectedJob.analysisSource}
                          </span>
                        </div>
                      )}
                      {selectedJob.analysisResult.mainSubject && (
                        <div className="text-sm">
                          <span className="text-neutral-500">Subject:</span>
                          <span>{selectedJob.analysisResult.mainSubject}</span>
                        </div>
                      )}
                      {selectedJob.analysisResult.imageStyle && (
                        <div className="text-sm">
                          <span className="text-neutral-500">Style:</span>
                          <Badge variant="outline" className="ml-1">
                            {selectedJob.analysisResult.imageStyle}
                          </Badge>
                        </div>
                      )}
                      {selectedJob.analysisResult.lightingCondition && (
                        <div className="text-sm">
                          <span className="text-neutral-500">Lighting:</span>
                          <span>
                            {selectedJob.analysisResult.lightingCondition}
                          </span>
                        </div>
                      )}
                      {/* Detected Defects */}
                      {selectedJob.analysisResult.defects && (
                        <div className="space-y-1">
                          <span className="text-sm text-neutral-500">
                            Detected Issues:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {selectedJob.analysisResult.defects.isDark && (
                              <Badge
                                variant="outline"
                                className="bg-neutral-800 text-neutral-200 text-xs"
                              >
                                Dark
                              </Badge>
                            )}
                            {selectedJob.analysisResult.defects.isBlurry && (
                              <Badge
                                variant="outline"
                                className="bg-amber-100 text-amber-800 text-xs"
                              >
                                Blurry
                              </Badge>
                            )}
                            {selectedJob.analysisResult.defects.hasNoise && (
                              <Badge
                                variant="outline"
                                className="bg-orange-100 text-orange-800 text-xs"
                              >
                                Noisy
                              </Badge>
                            )}
                            {selectedJob.analysisResult.defects
                              .hasVHSArtifacts && (
                              <Badge
                                variant="outline"
                                className="bg-purple-100 text-purple-800 text-xs"
                              >
                                VHS Artifacts
                              </Badge>
                            )}
                            {selectedJob.analysisResult.defects
                              .isLowResolution && (
                              <Badge
                                variant="outline"
                                className="bg-red-100 text-red-800 text-xs"
                              >
                                Low Res
                              </Badge>
                            )}
                            {selectedJob.analysisResult.defects.isOverexposed &&
                              (
                                <Badge
                                  variant="outline"
                                  className="bg-yellow-100 text-yellow-800 text-xs"
                                >
                                  Overexposed
                                </Badge>
                              )}
                            {selectedJob.analysisResult.defects.hasColorCast &&
                              (
                                <Badge
                                  variant="outline"
                                  className="bg-pink-100 text-pink-800 text-xs"
                                >
                                  Color Cast{selectedJob.analysisResult.defects
                                      .colorCastType
                                    ? ` (${selectedJob.analysisResult.defects.colorCastType})`
                                    : ""}
                                </Badge>
                              )}
                            {!selectedJob.analysisResult.defects.isDark &&
                              !selectedJob.analysisResult.defects.isBlurry &&
                              !selectedJob.analysisResult.defects.hasNoise &&
                              !selectedJob.analysisResult.defects
                                .hasVHSArtifacts &&
                              !selectedJob.analysisResult.defects
                                .isLowResolution &&
                              !selectedJob.analysisResult.defects
                                .isOverexposed &&
                              !selectedJob.analysisResult.defects
                                .hasColorCast &&
                              (
                                <Badge
                                  variant="outline"
                                  className="bg-green-100 text-green-800 text-xs"
                                >
                                  No Issues Detected
                                </Badge>
                              )}
                          </div>
                        </div>
                      )}
                      {/* Cropping Suggestion */}
                      {selectedJob.analysisResult.cropping &&
                        selectedJob.analysisResult.cropping.isCroppingNeeded &&
                        (
                          <div className="space-y-1 text-sm">
                            <span className="text-neutral-500">
                              Crop Suggestion:
                            </span>
                            <p className="text-xs">
                              {selectedJob.analysisResult.cropping.cropReason}
                            </p>
                            {selectedJob.analysisResult.cropping
                              .suggestedCrop && (
                              <p className="font-mono text-xs text-neutral-400">
                                L:{selectedJob.analysisResult.cropping
                                  .suggestedCrop.left}% T:{selectedJob
                                  .analysisResult.cropping.suggestedCrop.top}% R:{selectedJob
                                  .analysisResult.cropping
                                  .suggestedCrop.right}% B:{selectedJob
                                  .analysisResult.cropping.suggestedCrop
                                  .bottom}%
                              </p>
                            )}
                          </div>
                        )}
                      {/* Raw JSON (collapsed) */}
                      <details className="text-xs">
                        <summary className="cursor-pointer text-neutral-500 hover:text-neutral-300">
                          View Raw Analysis JSON
                        </summary>
                        <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-neutral-100 p-2 dark:bg-neutral-800">
                          {JSON.stringify(selectedJob.analysisResult, null, 2)}
                        </pre>
                      </details>
                    </div>
                  </div>
                )}
              </div>
            )}
        </Card>
      </div>

      {/* Modify & Run Dialog */}
      <Dialog open={showModifyDialog} onOpenChange={setShowModifyDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Modify & Run</DialogTitle>
            <DialogDescription>
              Edit the prompt and create a new {selectedJob?.mcpJobType === "MODIFY"
                ? "modification"
                : "generation"} job.
              {selectedJob?.mcpJobType === "MODIFY" &&
                " The original input image will be used."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Tier Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tier</label>
              <Select
                value={modifyTier}
                onValueChange={(value: string) => setModifyTier(value as EnhancementTier)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TIER_1K">1K (2 tokens)</SelectItem>
                  <SelectItem value="TIER_2K">2K (5 tokens)</SelectItem>
                  <SelectItem value="TIER_4K">4K (10 tokens)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Prompt Editing */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Prompt</label>
              <Textarea
                value={modifiedPrompt}
                onChange={(e) => setModifiedPrompt(e.target.value)}
                placeholder="Enter your prompt..."
                className="min-h-[200px]"
              />
              <p className="text-xs text-neutral-500">
                {modifiedPrompt.length} / 4000 characters
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowModifyDialog(false)}
              disabled={actionLoading === "modify"}
            >
              Cancel
            </Button>
            <Button
              onClick={handleModifyAndRun}
              disabled={actionLoading === "modify" || !modifiedPrompt.trim()}
            >
              {actionLoading === "modify" ? "Creating..." : "Create Job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
