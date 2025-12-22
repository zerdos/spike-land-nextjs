/**
 * Admin Agents Dashboard Client Component
 *
 * Real-time dashboard for monitoring external AI agents (Jules, etc.)
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { PRStatus } from "@/lib/agents/pr-status-types";
import type { ExternalAgentStatus } from "@prisma/client";
import { useCallback, useEffect, useState } from "react";

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
  QUEUED: "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
  PLANNING: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  AWAITING_PLAN_APPROVAL: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  AWAITING_USER_FEEDBACK: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  IN_PROGRESS: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  PAUSED: "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
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

  useEffect(() => {
    setLastUpdated(new Date());
  }, []);

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

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  }, [fetchData]);

  // Track page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === "visible";
      setIsVisible(visible);
      if (visible && isPolling) {
        fetchData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPolling, fetchData]);

  // Polling
  useEffect(() => {
    if (!isPolling || !isVisible) return;

    const intervalId = setInterval(fetchData, POLLING_INTERVAL);
    return () => clearInterval(intervalId);
  }, [isPolling, isVisible, fetchData]);

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
          <div className="text-right text-sm text-neutral-500">
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
          <p className="text-red-600 dark:text-red-400">Error: {error}</p>
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
          <p className="text-sm text-neutral-500">Total Sessions</p>
          <p className="mt-1 text-2xl font-bold">{data.pagination.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-500">Active Agents</p>
          <p className="mt-1 text-2xl font-bold text-cyan-600">{activeCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-500">Awaiting Approval</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {data.statusCounts.AWAITING_PLAN_APPROVAL || 0}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-500">Completed</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            {data.statusCounts.COMPLETED || 0}
          </p>
        </Card>
      </div>

      {/* Sessions List */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Agent Sessions</h2>
        {data.sessions.length === 0
          ? (
            <Card className="p-8 text-center">
              <p className="text-neutral-500">No agent sessions yet.</p>
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
  const [prStatus, setPrStatus] = useState<PRStatus | null>(null);
  const [prStatusLoading, setPrStatusLoading] = useState(false);

  // Fetch PR status when session has a PR URL
  useEffect(() => {
    if (!session.pullRequestUrl) return;

    const fetchPrStatus = async () => {
      setPrStatusLoading(true);
      try {
        const response = await fetch(`/api/admin/agents/${session.id}/pr-status`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setPrStatus(data.data);
          }
        }
      } catch {
        // Silently fail - PR status is optional
      } finally {
        setPrStatusLoading(false);
      }
    };

    fetchPrStatus();
  }, [session.id, session.pullRequestUrl]);

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
            <h3 className="max-w-[300px] truncate font-semibold" title={session.name}>
              {session.name}
            </h3>
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
          <div className="mt-2 flex items-center gap-4 text-xs text-neutral-500">
            {session.sourceRepo && (
              <span>Repo: {session.sourceRepo.split("/").slice(-2).join("/")}</span>
            )}
            {session.startingBranch && <span>Branch: {session.startingBranch}</span>}
            <span>Activities: {session.activityCount}</span>
            <span>
              Updated: {new Date(session.updatedAt).toLocaleString()}
            </span>
          </div>

          {/* PR Status Display */}
          {session.pullRequestUrl && (
            <PRStatusDisplay
              prStatus={prStatus}
              loading={prStatusLoading}
              pullRequestUrl={session.pullRequestUrl}
            />
          )}
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
              <span className="text-neutral-500">External ID:</span>{" "}
              <code className="text-xs">{session.externalId}</code>
            </div>
            <div>
              <span className="text-neutral-500">Created:</span>{" "}
              {new Date(session.createdAt).toLocaleString()}
            </div>
            {session.planApprovedAt && (
              <div>
                <span className="text-neutral-500">Plan Approved:</span>{" "}
                {new Date(session.planApprovedAt).toLocaleString()}
              </div>
            )}
            {session.outputBranch && (
              <div>
                <span className="text-neutral-500">Output Branch:</span> {session.outputBranch}
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

/**
 * PR Status Display Component
 * Shows PR info, CI status, branch sync, and preview URL
 */
interface PRStatusDisplayProps {
  prStatus: PRStatus | null;
  loading: boolean;
  pullRequestUrl: string;
}

function PRStatusDisplay({ prStatus, loading, pullRequestUrl }: PRStatusDisplayProps) {
  if (loading) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs dark:border-neutral-700 dark:bg-neutral-800">
        <span className="animate-pulse text-neutral-500">Loading PR status...</span>
      </div>
    );
  }

  if (!prStatus) {
    // Fallback: just show basic PR link
    return (
      <div className="mt-3 flex items-center gap-3 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs dark:border-neutral-700 dark:bg-neutral-800">
        <a
          href={pullRequestUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          View Pull Request
        </a>
      </div>
    );
  }

  const CIIcon = prStatus.ciStatus === "success"
    ? "✓"
    : prStatus.ciStatus === "failure"
    ? "✗"
    : prStatus.ciStatus === "pending"
    ? "◐"
    : "?";

  const ciColorClass = prStatus.ciStatus === "success"
    ? "text-green-600 dark:text-green-400"
    : prStatus.ciStatus === "failure"
    ? "text-red-600 dark:text-red-400"
    : prStatus.ciStatus === "pending"
    ? "text-amber-600 dark:text-amber-400"
    : "text-neutral-500";

  const syncIcon = prStatus.isUpToDate ? "✓" : "⚠";
  const syncColorClass = prStatus.isUpToDate
    ? "text-green-600 dark:text-green-400"
    : "text-amber-600 dark:text-amber-400";

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs dark:border-neutral-700 dark:bg-neutral-800">
      {/* PR Link with target branch */}
      <a
        href={prStatus.prUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
      >
        <span>PR #{prStatus.prNumber}</span>
        <span className="text-neutral-400">→</span>
        <span>{prStatus.targetBranch}</span>
      </a>

      {/* Divider */}
      <span className="text-neutral-300 dark:text-neutral-600">|</span>

      {/* Branch sync status */}
      <span className={`flex items-center gap-1 ${syncColorClass}`}>
        <span>{syncIcon}</span>
        <span>
          {prStatus.isUpToDate
            ? "Up to date"
            : `${prStatus.behindBy} behind`}
        </span>
      </span>

      {/* Divider */}
      <span className="text-neutral-300 dark:text-neutral-600">|</span>

      {/* CI Status */}
      <span className={`flex items-center gap-1 ${ciColorClass}`} title={prStatus.ciStatusMessage}>
        <span>{CIIcon}</span>
        <span>
          {prStatus.ciStatus === "success"
            ? "CI passing"
            : prStatus.ciStatus === "failure"
            ? `CI failed (${prStatus.checksFailed}/${prStatus.checksTotal})`
            : prStatus.ciStatus === "pending"
            ? `CI pending (${prStatus.checksPending})`
            : "CI unknown"}
        </span>
      </span>

      {/* Preview URL */}
      {prStatus.previewUrl && (
        <>
          <span className="text-neutral-300 dark:text-neutral-600">|</span>
          <a
            href={prStatus.previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-purple-600 hover:underline dark:text-purple-400"
          >
            <span>🔗</span>
            <span>Preview</span>
          </a>
        </>
      )}

      {/* Draft badge */}
      {prStatus.draft && (
        <Badge variant="outline" className="text-[10px]">
          Draft
        </Badge>
      )}
    </div>
  );
}
