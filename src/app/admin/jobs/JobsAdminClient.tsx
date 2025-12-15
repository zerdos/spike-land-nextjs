/**
 * Jobs Admin Client Component
 *
 * Client-side component for the admin jobs management page.
 * Features:
 * - Tab filtering by job status
 * - Job list with pagination
 * - Job detail panel with before/after comparison
 * - Processing time and metadata display
 */

"use client";

import { ImageComparisonSlider } from "@/components/enhance/ImageComparisonSlider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EnhancementTier, JobStatus } from "@prisma/client";
import { useCallback, useEffect, useState } from "react";

interface JobImage {
  id: string;
  name: string;
  originalUrl: string;
  originalWidth: number | null;
  originalHeight: number | null;
  originalSizeBytes: number | null;
}

interface JobUser {
  id: string;
  name: string | null;
  email: string;
}

interface Job {
  id: string;
  imageId: string;
  userId: string;
  tier: EnhancementTier;
  tokensCost: number;
  status: JobStatus;
  enhancedUrl: string | null;
  enhancedR2Key: string | null;
  enhancedWidth: number | null;
  enhancedHeight: number | null;
  enhancedSizeBytes: number | null;
  errorMessage: string | null;
  retryCount: number;
  maxRetries: number;
  geminiPrompt: string | null;
  geminiModel: string | null;
  geminiTemp: number | null;
  processingStartedAt: string | null;
  processingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  workflowRunId: string | null;
  image: JobImage;
  user: JobUser;
}

interface JobsResponse {
  jobs: Job[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  statusCounts: Record<string, number>;
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

const STATUS_COLORS: Record<JobStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  PROCESSING: "bg-blue-100 text-blue-800 border-blue-200 animate-pulse",
  COMPLETED: "bg-green-100 text-green-800 border-green-200",
  FAILED: "bg-red-100 text-red-800 border-red-200",
  CANCELLED: "bg-neutral-100 text-neutral-800 border-neutral-200",
  REFUNDED: "bg-purple-100 text-purple-800 border-purple-200",
};

const TIER_LABELS: Record<EnhancementTier, string> = {
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

export function JobsAdminClient() {
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchJobs = useCallback(
    async (status: JobStatus | null, page: number, search: string) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (status) params.set("status", status);
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

        // Clear selection if the selected job is no longer in the list
        if (selectedJob && !data.jobs.find((j) => j.id === selectedJob.id)) {
          setSelectedJob(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [selectedJob],
  );

  // Note: eslint-disable is intentional here. We exclude:
  // - fetchJobs: it's memoized with useCallback and stable
  // - searchQuery: changes are handled separately via handleSearch() to avoid fetches on every keystroke
  useEffect(() => {
    const status = STATUS_TABS.find((t) => t.key === activeTab)?.status ?? null;
    fetchJobs(status, pagination.page, searchQuery);
  }, [activeTab, pagination.page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    setPagination((p) => ({ ...p, page: 1 }));
    const status = STATUS_TABS.find((t) => t.key === activeTab)?.status ?? null;
    fetchJobs(status, 1, searchQuery);
  };

  const handleRefresh = () => {
    const status = STATUS_TABS.find((t) => t.key === activeTab)?.status ?? null;
    fetchJobs(status, pagination.page, searchQuery);
  };

  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey);
    setPagination((p) => ({ ...p, page: 1 }));
    setSelectedJob(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Jobs Management</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          View and manage all enhancement jobs
        </p>
      </div>

      {/* Tabs */}
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

      {/* Search and Refresh */}
      <div className="flex gap-2" role="search">
        <input
          type="text"
          placeholder="Search by Job ID or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
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
            ? <p className="text-neutral-500">No jobs found</p>
            : (
              <div className="max-h-[600px] space-y-2 overflow-y-auto">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className={`cursor-pointer rounded-md border p-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 ${
                      selectedJob?.id === job.id
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-neutral-200 dark:border-neutral-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
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
                      {job.user.email}
                    </div>
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
                {/* Before/After Comparison for Completed Jobs */}
                {selectedJob.status === "COMPLETED" &&
                  selectedJob.enhancedUrl && (
                  <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <ImageComparisonSlider
                      originalUrl={selectedJob.image.originalUrl}
                      enhancedUrl={selectedJob.enhancedUrl}
                      originalLabel="Original"
                      enhancedLabel="Enhanced"
                      width={selectedJob.enhancedWidth || 16}
                      height={selectedJob.enhancedHeight || 9}
                    />
                  </div>
                )}

                {/* Job Info Grid */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Status & Timing */}
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

                {/* Enhancement Details */}
                <div className="border-t border-neutral-200 pt-4 dark:border-neutral-700">
                  <h3 className="mb-2 text-sm font-semibold">
                    Enhancement Details
                  </h3>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Tier</span>
                      <span>
                        {TIER_LABELS[selectedJob.tier]} ({selectedJob.tokensCost} tokens)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Original</span>
                      <span>
                        {selectedJob.image.name || "Unnamed"}{" "}
                        ({selectedJob.image.originalWidth}x{selectedJob.image
                          .originalHeight}, {formatBytes(selectedJob.image.originalSizeBytes)})
                      </span>
                    </div>
                    {selectedJob.enhancedUrl && (
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Enhanced</span>
                        <span>
                          {selectedJob.enhancedWidth}x{selectedJob
                            .enhancedHeight}, {formatBytes(selectedJob.enhancedSizeBytes)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Retries</span>
                      <span>
                        {selectedJob.retryCount}/{selectedJob.maxRetries}
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI Model Details */}
                <div className="border-t border-neutral-200 pt-4 dark:border-neutral-700">
                  <h3 className="mb-2 text-sm font-semibold">AI Model</h3>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Model</span>
                      <span className="font-mono text-xs">
                        {selectedJob.geminiModel || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Temperature</span>
                      <span>
                        {selectedJob.geminiTemp !== null
                          ? selectedJob.geminiTemp
                          : "Default"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Prompt */}
                {selectedJob.geminiPrompt && (
                  <div className="border-t border-neutral-200 pt-4 dark:border-neutral-700">
                    <h3 className="mb-2 text-sm font-semibold">Prompt</h3>
                    <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded-md bg-neutral-100 p-2 text-xs dark:bg-neutral-800">
                    {selectedJob.geminiPrompt}
                    </pre>
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
                    <p>{selectedJob.user.name || "Unknown"}</p>
                    <p className="text-neutral-500">{selectedJob.user.email}</p>
                  </div>
                </div>

                {/* IDs */}
                <div className="border-t border-neutral-200 pt-4 dark:border-neutral-700">
                  <h3 className="mb-2 text-sm font-semibold">IDs</h3>
                  <div className="grid gap-1 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Job</span>
                      <span>{selectedJob.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Image</span>
                      <span>{selectedJob.imageId}</span>
                    </div>
                    {selectedJob.workflowRunId && (
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Workflow</span>
                        <span>{selectedJob.workflowRunId}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
        </Card>
      </div>
    </div>
  );
}
