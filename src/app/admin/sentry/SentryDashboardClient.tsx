"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCallback, useEffect, useState } from "react";

interface SentryIssue {
  id: string;
  title: string;
  culprit: string;
  level: string;
  status: string;
  count: string;
  firstSeen: string;
  lastSeen: string;
  shortId: string;
}

interface SentryIssueDetail extends SentryIssue {
  metadata: Record<string, unknown>;
  type: string;
  permalink: string;
}

interface SentryStats {
  received: number[];
  rejected: number[];
  blacklisted: number[];
}

const LEVEL_COLORS: Record<string, string> = {
  fatal: "bg-red-900/30 text-red-400",
  error: "bg-red-900/30 text-red-400",
  warning: "bg-yellow-900/30 text-yellow-400",
  info: "bg-blue-900/30 text-blue-400",
  debug: "bg-gray-900/30 text-gray-400",
};

const STATUS_COLORS: Record<string, string> = {
  unresolved: "bg-red-900/30 text-red-400",
  resolved: "bg-green-900/30 text-green-400",
  ignored: "bg-gray-900/30 text-gray-400",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sumArray(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

export function SentryDashboardClient() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [issues, setIssues] = useState<SentryIssue[]>([]);
  const [stats, setStats] = useState<SentryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedIssue, setSelectedIssue] = useState<SentryIssueDetail | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ action: "issues" });
      if (query) params.set("query", query);

      const [issuesRes, statsRes] = await Promise.all([
        fetch(`/api/admin/sentry?${params}`),
        fetch("/api/admin/sentry?action=stats"),
      ]);

      if (issuesRes.ok) {
        const issuesData = await issuesRes.json();
        setConfigured(issuesData.configured);
        if (issuesData.configured) {
          setIssues(issuesData.issues ?? []);
        }
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.configured && statsData.stats) {
          setStats(statsData.stats);
        }
      }
    } catch {
      // Network error - leave current state
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewDetail = async (issueId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(
        `/api/admin/sentry?action=detail&issueId=${issueId}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data.issue) {
          setSelectedIssue(data.issue);
        }
      }
    } catch {
      // ignore
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  if (loading && configured === null) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading Sentry data...
        </CardContent>
      </Card>
    );
  }

  if (configured === false) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sentry Not Configured</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Set the <code className="rounded bg-muted px-1 py-0.5 text-sm font-mono">SENTRY_MCP_AUTH_TOKEN</code> environment
            variable to enable Sentry integration. You can generate a token from your{" "}
            <a
              href="https://sentry.io/settings/auth-tokens/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Sentry settings
            </a>.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalReceived = stats ? sumArray(stats.received) : 0;
  const totalRejected = stats ? sumArray(stats.rejected) : 0;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">
              Events Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReceived}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">
              Events Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRejected}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">
              Open Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {issues.filter((i) => i.status === "unresolved").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">
              Connection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm text-green-400">Connected</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search issues (e.g. is:unresolved, TypeError)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Loading..." : "Search"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setQuery("");
              }}
            >
              Clear
            </Button>
            <Button type="button" variant="ghost" onClick={fetchData}>
              Refresh
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Issues Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-900">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Level
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Events
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    First Seen
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Last Seen
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {issues.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-neutral-500"
                    >
                      No issues found
                    </td>
                  </tr>
                ) : (
                  issues.map((issue) => (
                    <tr key={issue.id} className="hover:bg-neutral-900/50">
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            LEVEL_COLORS[issue.level] ||
                            "bg-gray-800 text-gray-400"
                          }
                          variant="secondary"
                        >
                          {issue.level}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm max-w-md">
                        <div className="text-foreground font-medium truncate">
                          {issue.title}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {issue.culprit}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">
                        {issue.count}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(issue.firstSeen)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(issue.lastSeen)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            STATUS_COLORS[issue.status] ||
                            "bg-gray-800 text-gray-400"
                          }
                          variant="secondary"
                        >
                          {issue.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={detailLoading}
                          onClick={() => handleViewDetail(issue.id)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Issue Detail Dialog */}
      <Dialog
        open={!!selectedIssue}
        onOpenChange={() => setSelectedIssue(null)}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Issue Detail</span>
              {selectedIssue && (
                <Badge
                  className={
                    LEVEL_COLORS[selectedIssue.level] ||
                    "bg-gray-800 text-gray-400"
                  }
                  variant="secondary"
                >
                  {selectedIssue.level}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedIssue && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <span className="text-sm font-medium text-neutral-500">
                    Short ID
                  </span>
                  <p className="text-sm font-mono">{selectedIssue.shortId}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-neutral-500">
                    Type
                  </span>
                  <p className="text-sm">{selectedIssue.type}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-neutral-500">
                    Status
                  </span>
                  <p className="text-sm">{selectedIssue.status}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-neutral-500">
                    Events
                  </span>
                  <p className="text-sm font-mono">{selectedIssue.count}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-neutral-500">
                    First Seen
                  </span>
                  <p className="text-sm">
                    {new Date(selectedIssue.firstSeen).toLocaleString("en-GB")}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-neutral-500">
                    Last Seen
                  </span>
                  <p className="text-sm">
                    {new Date(selectedIssue.lastSeen).toLocaleString("en-GB")}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-sm font-medium text-neutral-500">
                  Title
                </span>
                <div className="mt-1 rounded-md bg-red-900/20 p-3">
                  <p className="text-sm text-red-300 break-all">
                    {selectedIssue.title}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-sm font-medium text-neutral-500">
                  Culprit
                </span>
                <p className="text-sm font-mono text-muted-foreground">
                  {selectedIssue.culprit}
                </p>
              </div>

              {selectedIssue.metadata &&
                Object.keys(selectedIssue.metadata).length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-neutral-500">
                      Metadata
                    </span>
                    <pre className="mt-1 rounded-md bg-neutral-900 p-3 text-xs overflow-x-auto">
                      {JSON.stringify(selectedIssue.metadata, null, 2)}
                    </pre>
                  </div>
                )}

              {selectedIssue.permalink && (
                <div className="pt-2">
                  <a
                    href={selectedIssue.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline text-sm"
                  >
                    View on Sentry
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
