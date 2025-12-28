/**
 * Git Info Panel Component
 *
 * Displays git repository information (branch, changes, sync status)
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface GitInfo {
  repository: string;
  branch: string;
  baseBranch: string;
  changedFiles: Array<{ path: string; status: string; }>;
  uncommittedChanges: number;
  aheadBy: number;
  behindBy: number;
  lastCommit: {
    hash: string;
    message: string;
    author: string;
    date: string;
  } | null;
}

interface GitInfoPanelProps {
  gitInfo: GitInfo | null;
  loading?: boolean;
  error?: string | null;
}

export function GitInfoPanel({ gitInfo, loading, error }: GitInfoPanelProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Git Info</CardTitle>
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
          <CardTitle>Git Info</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!gitInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Git Info</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">No git data available</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate sync status text - must include "ahead", "behind", or "up to date" for E2E
  const getSyncStatus = () => {
    if (gitInfo.aheadBy === 0 && gitInfo.behindBy === 0) {
      return "up to date";
    }
    const parts: string[] = [];
    if (gitInfo.aheadBy > 0) {
      parts.push(`${gitInfo.aheadBy} ahead`);
    }
    if (gitInfo.behindBy > 0) {
      parts.push(`${gitInfo.behindBy} behind`);
    }
    return parts.join(", ");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Git Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Branch */}
        <div
          data-testid="git-branch"
          className="flex items-center justify-between"
        >
          <span className="text-sm">Branch</span>
          <Badge variant="outline">{gitInfo.branch}</Badge>
        </div>

        {/* Changed Files */}
        <div
          data-testid="git-changes"
          className="flex items-center justify-between"
        >
          <span className="text-sm">Changed files</span>
          <Badge variant={gitInfo.uncommittedChanges > 0 ? "warning" : "secondary"}>
            {gitInfo.uncommittedChanges} modified
          </Badge>
        </div>

        {/* Sync Status */}
        <div
          data-testid="git-sync"
          className="flex items-center justify-between"
        >
          <span className="text-sm">Sync</span>
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            {getSyncStatus()}
          </span>
        </div>

        {/* Last Commit */}
        {gitInfo.lastCommit && (
          <div
            data-testid="git-last-commit"
            className="border-t pt-2"
          >
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Last commit: {gitInfo.lastCommit.message}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
