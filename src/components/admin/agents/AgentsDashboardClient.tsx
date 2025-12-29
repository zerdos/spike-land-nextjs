/**
 * Admin Agents Dashboard Client Component
 *
 * Real-time dashboard for monitoring external AI agents (Jules, etc.)
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ExternalAgentStatus } from "@prisma/client";
import { useCallback, useEffect, useState } from "react";

import { type GitHubData, GitHubIssuesPanel } from "./GitHubIssuesPanel";
import { type GitInfo, GitInfoPanel } from "./GitInfoPanel";
import { ResourcesPanel, type ResourceStatus } from "./ResourcesPanel";

interface AgentSession {
  id: string;
  externalId: string;
  provider: string;
  name: string;
  description: string | null;
  status: ExternalAgentStatus;
  sourceRepo: string | null;
  startingBranch: string | null;
  outputBranch: string | null;
  pullRequestUrl: string | null;
  planSummary: string | null;
  planApprovedAt: string | null;
  lastActivityAt: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  activityCount: number;
}

interface DashboardData {
  sessions: AgentSession[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  statusCounts: Record<string, number>;
  julesAvailable: boolean;
  error: string | null;
}

interface Props {
  initialData: DashboardData;
}

const POLLING_INTERVAL = 30000;

const STATUS_COLORS: Record<ExternalAgentStatus, string> = {
  QUEUED: "bg-neutral-800 text-neutral-200",
  PLANNING: "bg-blue-900 text-blue-200",
  AWAITING_PLAN_APPROVAL: "bg-amber-900 text-amber-200",
  AWAITING_USER_FEEDBACK: "bg-purple-900 text-purple-200",
  IN_PROGRESS: "bg-cyan-900 text-cyan-200",
  PAUSED: "bg-neutral-700 text-neutral-300",
  FAILED: "bg-red-900 text-red-200",
  COMPLETED: "bg-green-900 text-green-200",
};

const STATUS_LABELS: Record<ExternalAgentStatus, string> = {
  QUEUED: "Queued",
  PLANNING: "Planning",
  AWAITING_PLAN_APPROVAL: "Awaiting Approval",
  AWAITING_USER_FEEDBACK: "Awaiting Feedback",
  IN_PROGRESS: "In Progress",
  PAUSED: "Paused",
  FAILED: "Failed",
  COMPLETED: "Completed",
};

/**
 * Type guard for session metadata with Jules URL
 */
interface SessionMetadata {
  julesUrl?: string;
}

function isSessionMetadata(meta: unknown): meta is SessionMetadata {
  return meta !== null && typeof meta === "object";
}

export function AgentsDashboardClient({ initialData }: Props) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [isPolling, setIsPolling] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(initialData.error);
  const [isVisible, setIsVisible] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New panel states
  const [resourcesData, setResourcesData] = useState<ResourceStatus | null>(null);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [resourcesError, setResourcesError] = useState<string | null>(null);

  const [gitInfoData, setGitInfoData] = useState<GitInfo | null>(null);
  const [gitInfoLoading, setGitInfoLoading] = useState(true);
  const [gitInfoError, setGitInfoError] = useState<string | null>(null);

  const [gitHubData, setGitHubData] = useState<GitHubData | null>(null);
  const [gitHubLoading, setGitHubLoading] = useState(true);
  const [gitHubError, setGitHubError] = useState<string | null>(null);
  const [gitHubConfigured, setGitHubConfigured] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/agents");
      if (!response.ok) {
        throw new Error("Failed to fetch agents data");
      }
      const newData = await response.json();
      setData(newData);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, []);

  const fetchResources = useCallback(async () => {
    setResourcesLoading(true);
    try {
      const response = await fetch("/api/admin/agents/resources");
      if (!response.ok) {
        throw new Error("Failed to fetch resources");
      }
      const result = await response.json();
      setResourcesData(result.resources);
      setResourcesError(null);
    } catch (err) {
      setResourcesError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setResourcesLoading(false);
    }
  }, []);

  const fetchGitInfo = useCallback(async () => {
    setGitInfoLoading(true);
    try {
      const response = await fetch("/api/admin/agents/git");
      if (!response.ok) {
        throw new Error("Failed to fetch git info");
      }
      const result = await response.json();
      setGitInfoData(result);
      setGitInfoError(null);
    } catch (err) {
      setGitInfoError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGitInfoLoading(false);
    }
  }, []);

  const fetchGitHub = useCallback(async () => {
    setGitHubLoading(true);
    try {
      const response = await fetch("/api/admin/agents/github/issues");
      if (response.status === 503) {
        setGitHubConfigured(false);
        setGitHubData(null);
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to fetch GitHub data");
      }
      const result = await response.json();
      setGitHubData(result);
      setGitHubConfigured(true);
      setGitHubError(null);
    } catch (err) {
      setGitHubError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGitHubLoading(false);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    await Promise.all([fetchData(), fetchResources(), fetchGitInfo(), fetchGitHub()]);
  }, [fetchData, fetchResources, fetchGitInfo, fetchGitHub]);

  // Initial fetch for all panel data
  useEffect(() => {
    setLastUpdated(new Date());
    fetchResources();
    fetchGitInfo();
    fetchGitHub();
  }, [fetchResources, fetchGitInfo, fetchGitHub]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchAllData();
    setIsRefreshing(false);
  }, [fetchAllData]);

  // Track page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === "visible";
      setIsVisible(visible);
      if (visible && isPolling) {
        fetchAllData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPolling, fetchAllData]);

  // Polling
  useEffect(() => {
    if (!isPolling || !isVisible) return;

    const intervalId = setInterval(fetchAllData, POLLING_INTERVAL);
    return () => clearInterval(intervalId);
  }, [isPolling, isVisible, fetchAllData]);

  // Count active agents (not completed/failed)
  const activeCount = data.sessions.filter(
    (s) => !["COMPLETED", "FAILED"].includes(s.status),
  ).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agents Dashboard</h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            Monitor and manage external AI agents
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {data.julesAvailable && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowCreateModal(true)}
              >
                + New Task
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPolling(!isPolling)}
            >
              {isPolling ? "Pause" : "Resume"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
          <div
            className="text-right text-sm text-neutral-600 dark:text-neutral-400"
            data-testid="timestamp"
          >
            <p>
              Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : "—"}
            </p>
            {isPolling && (
              <Badge variant="secondary" className="text-xs">
                Live
              </Badge>
            )}
          </div>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-center justify-between">
            <p className="text-red-600 dark:text-red-400">Error: {error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
            >
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Jules Status Banner */}
      {!data.julesAvailable && (
        <Card className="border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Jules API not configured
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-300">
                Set the JULES_API_KEY environment variable to enable Jules integration.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Total</p>
          <p className="mt-1 text-2xl font-bold">{data.pagination.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Active</p>
          <p className="mt-1 text-2xl font-bold text-cyan-600">{activeCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Completed</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            {data.statusCounts.COMPLETED || 0}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Failed</p>
          <p className="mt-1 text-2xl font-bold text-red-600">
            {data.statusCounts.FAILED || 0}
          </p>
        </Card>
      </div>

      {/* Info Panels */}
      <div className="grid gap-4 md:grid-cols-3">
        <ResourcesPanel
          resources={resourcesData}
          loading={resourcesLoading}
          error={resourcesError}
        />
        <GitInfoPanel
          gitInfo={gitInfoData}
          loading={gitInfoLoading}
          error={gitInfoError}
        />
        <GitHubIssuesPanel
          data={gitHubData}
          loading={gitHubLoading}
          error={gitHubError}
          isConfigured={gitHubConfigured}
        />
      </div>

      {/* Sessions List */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Agent Sessions</h2>
        <div data-testid="sessions-list">
          {data.sessions.length === 0
            ? (
              <Card className="p-8 text-center">
                <p className="text-neutral-600 dark:text-neutral-400">No active agents</p>
                {data.julesAvailable && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setShowCreateModal(true)}
                  >
                    Create your first task
                  </Button>
                )}
              </Card>
            )
            : (
              <div className="space-y-4">
                {data.sessions.map((session) => (
                  <AgentSessionCard
                    key={session.id}
                    session={session}
                    onStatusChange={handleRefresh}
                  />
                ))}
              </div>
            )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateSessionModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            handleRefresh();
          }}
        />
      )}
    </div>
  );
}

interface AgentSessionCardProps {
  session: AgentSession;
  onStatusChange?: () => void;
}

function AgentSessionCard({ session, onStatusChange }: AgentSessionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  const handleApprovePlan = async () => {
    setIsApproving(true);
    setApproveError(null);
    try {
      const response = await fetch(`/api/admin/agents/${session.id}/approve-plan`, {
        method: "POST",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to approve plan");
      }
      // Trigger parent refresh via callback
      onStatusChange?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setApproveError(message);
      console.error(err);
    } finally {
      setIsApproving(false);
    }
  };

  // Safely extract julesUrl from metadata using type guard
  const julesUrl = isSessionMetadata(session.metadata)
    ? session.metadata.julesUrl
    : undefined;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <h3 className="font-semibold">{session.name}</h3>
            <Badge className={STATUS_COLORS[session.status]}>
              {STATUS_LABELS[session.status]}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {session.provider}
            </Badge>
          </div>
          {session.description && (
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">
              {session.description}
            </p>
          )}
          {approveError && (
            <p className="mt-1 text-sm text-red-600">
              Error: {approveError}
            </p>
          )}
          <div className="mt-2 flex items-center gap-4 text-xs text-neutral-600 dark:text-neutral-400">
            {session.sourceRepo && (
              <span>Repo: {session.sourceRepo.split("/").slice(-2).join("/")}</span>
            )}
            {session.startingBranch && <span>Branch: {session.startingBranch}</span>}
            <span>Activities: {session.activityCount}</span>
            <span>
              Updated: {new Date(session.updatedAt).toLocaleString()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {session.status === "AWAITING_PLAN_APPROVAL" && (
            <Button
              size="sm"
              onClick={handleApprovePlan}
              disabled={isApproving}
            >
              {isApproving ? "Approving..." : "Approve Plan"}
            </Button>
          )}
          {session.pullRequestUrl && (
            <a
              href={session.pullRequestUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" variant="outline">
                View PR
              </Button>
            </a>
          )}
          {julesUrl && (
            <a href={julesUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost">
                Open in Jules
              </Button>
            </a>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "▲" : "▼"}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 border-t pt-4">
          {session.planSummary && (
            <div className="mb-4">
              <h4 className="text-sm font-medium">Plan Summary</h4>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                {session.planSummary}
              </p>
            </div>
          )}
          {session.errorMessage && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-red-600">Error</h4>
              <p className="mt-1 text-sm text-red-500">{session.errorMessage}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-neutral-600 dark:text-neutral-400">External ID:</span>{" "}
              <code className="text-xs">{session.externalId}</code>
            </div>
            <div>
              <span className="text-neutral-600 dark:text-neutral-400">Created:</span>{" "}
              {new Date(session.createdAt).toLocaleString()}
            </div>
            {session.planApprovedAt && (
              <div>
                <span className="text-neutral-600 dark:text-neutral-400">Plan Approved:</span>{" "}
                {new Date(session.planApprovedAt).toLocaleString()}
              </div>
            )}
            {session.outputBranch && (
              <div>
                <span className="text-neutral-600 dark:text-neutral-400">Output Branch:</span>{" "}
                {session.outputBranch}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function CreateSessionModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [task, setTask] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, task }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create session");
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg p-6">
        <h2 className="mb-4 text-xl font-semibold">Create New Jules Task</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
              placeholder="Short title for the task"
              required
            />
          </div>

          <div>
            <label htmlFor="task" className="block text-sm font-medium">
              Task Description
            </label>
            <textarea
              id="task"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
              rows={5}
              placeholder="Detailed description of what the agent should do..."
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
