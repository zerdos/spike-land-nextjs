/**
 * GitHub Issues Panel Component
 *
 * Displays GitHub issues and workflow runs
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  labels: string[];
  createdAt: string;
  url: string;
}

export interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  createdAt: string;
  url: string;
}

export interface GitHubData {
  issues: GitHubIssue[];
  workflows: WorkflowRun[];
  githubConfigured: boolean;
}

interface GitHubIssuesPanelProps {
  data: GitHubData | null;
  loading?: boolean;
  error?: string | null;
  isConfigured: boolean;
}

export function GitHubIssuesPanel({
  data,
  loading,
  error,
  isConfigured,
}: GitHubIssuesPanelProps) {
  if (!isConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GitHub Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            GitHub API is not configured. Set GH_PAT_TOKEN environment variable.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GitHub Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="loading animate-pulse space-y-2">
            <div className="h-4 w-3/4 rounded bg-neutral-200 dark:bg-neutral-700" />
            <div className="h-4 w-1/2 rounded bg-neutral-200 dark:bg-neutral-700" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GitHub Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GitHub Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">No GitHub data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>GitHub Issues</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Issues */}
        <div data-testid="github-issues">
          <h4 className="mb-2 text-sm font-medium">Open Issues</h4>
          {data.issues.length === 0
            ? <p className="text-sm text-neutral-600 dark:text-neutral-400">No open issues</p>
            : (
              <ul className="space-y-1">
                {data.issues.slice(0, 5).map((issue) => (
                  <li key={issue.number} data-testid={`issue-${issue.number}`}>
                    <a
                      href={issue.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                    >
                      #{issue.number} {issue.title}
                    </a>
                  </li>
                ))}
              </ul>
            )}
        </div>

        {/* Workflow Runs */}
        <div data-testid="github-workflows">
          <h4 className="mb-2 text-sm font-medium">Recent Workflow Runs</h4>
          {data.workflows.length === 0
            ? <p className="text-sm text-neutral-600 dark:text-neutral-400">No workflow runs</p>
            : (
              <ul className="space-y-2">
                {data.workflows.slice(0, 5).map((workflow) => (
                  <li
                    key={workflow.id}
                    data-testid={`workflow-${workflow.id}`}
                    className="flex items-center justify-between"
                  >
                    <a
                      href={workflow.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-neutral-700 hover:underline dark:text-neutral-300"
                    >
                      {workflow.name}
                    </a>
                    <Badge
                      className="status-badge"
                      variant={workflow.conclusion === "success"
                        ? "success"
                        : workflow.conclusion === "failure"
                        ? "destructive"
                        : "secondary"}
                    >
                      {workflow.conclusion || workflow.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
