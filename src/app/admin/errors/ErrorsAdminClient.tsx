/**
 * Admin Errors Client Component
 *
 * Interactive component for viewing and filtering error logs
 * with real-time polling and fuzzy search.
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMounted } from "@/hooks/useMounted";
import type { Prisma } from "@prisma/client";
import { useCallback, useEffect, useState } from "react";

type ErrorEnvironment = "FRONTEND" | "BACKEND";

interface ErrorLog {
  id: string;
  timestamp: string | Date;
  message: string;
  stack: string | null;
  sourceFile: string | null;
  sourceLine: number | null;
  sourceColumn: number | null;
  callerName: string | null;
  userId: string | null;
  route: string | null;
  environment: ErrorEnvironment;
  errorType: string | null;
  errorCode: string | null;
  // Metadata can be any JSON-like object.
  // Using Prisma's JsonValue type provides better type safety than `any`.
  metadata: Prisma.JsonValue;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Stats {
  total24h: number;
  totalByType?: Record<string, number>;
  totalByFile?: Record<string, number>;
}

interface InitialData {
  errors: ErrorLog[];
  pagination: Pagination;
  stats: Stats;
}

interface ErrorsAdminClientProps {
  initialData: InitialData;
}

const ENVIRONMENT_COLORS: Record<ErrorEnvironment, string> = {
  FRONTEND: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  BACKEND: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

const ERROR_TYPE_COLORS: Record<string, string> = {
  Error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  TypeError: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  SyntaxError: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  ReferenceError: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
};

function formatDate(dateInput: string | Date): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatFilePath(path: string | null): string {
  if (!path) return "Unknown";
  // Extract just the relative path from full path
  const match = path.match(/(?:src|app|lib|components)\/[^\s)]+/);
  return match ? match[0] : path.split("/").slice(-2).join("/");
}

function truncateMessage(message: string, maxLength: number = 80): string {
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength) + "...";
}

export function ErrorsAdminClient({ initialData }: ErrorsAdminClientProps) {
  const mounted = useMounted();
  const [errors, setErrors] = useState<ErrorLog[]>(initialData.errors);
  const [pagination, setPagination] = useState<Pagination>(
    initialData.pagination,
  );
  const [stats, setStats] = useState<Stats>(initialData.stats);
  const [loading, setLoading] = useState(false);
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [environment, setEnvironment] = useState<ErrorEnvironment | "ALL">(
    "ALL",
  );
  const [page, setPage] = useState(1);

  // Polling
  const [isPolling, setIsPolling] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Clear all
  const [isClearing, setIsClearing] = useState(false);

  const fetchErrors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "50");
      if (search) params.set("search", search);
      if (environment !== "ALL") params.set("environment", environment);

      const response = await fetch(`/api/admin/errors?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch errors");

      const data = await response.json();
      setErrors(data.errors);
      setPagination(data.pagination);
      setStats(data.stats);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error fetching errors:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, environment]);

  // Poll for updates every 30 seconds
  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(fetchErrors, 30000);
    return () => clearInterval(interval);
  }, [fetchErrors, isPolling]);

  // Pause polling when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPolling(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Fetch on filter change
  useEffect(() => {
    fetchErrors();
  }, [fetchErrors]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchErrors();
  };

  // Error simulation handlers
  const simulateFrontendError = () => {
    // Trigger a console.error that will be captured by the console capture system
    console.error(
      new Error("Test frontend error - simulated for testing"),
    );
    // Refresh after a short delay to see the error
    setTimeout(fetchErrors, 1000);
  };

  const simulateBackendError = async () => {
    await fetch("/api/admin/errors/test", { method: "POST" });
    // Refresh after a short delay to see the error
    setTimeout(fetchErrors, 1000);
  };

  const handleClearAll = async () => {
    if (
      !confirm(
        `Are you sure you want to delete ALL ${pagination.total} error logs?\n\nThis action cannot be undone.`,
      )
    ) {
      return;
    }

    setIsClearing(true);
    try {
      const response = await fetch("/api/admin/errors", { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to clear errors");
      await fetchErrors();
    } catch (error) {
      console.error("Error clearing logs:", error);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">
              Last 24 Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total24h}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">
              Total Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {isPolling
                ? (
                  <>
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-500" />
                    <span className="text-sm text-green-600 dark:text-green-400">
                      Live
                    </span>
                  </>
                )
                : (
                  <>
                    <span className="inline-block h-2 w-2 rounded-full bg-gray-400" />
                    <span className="text-sm text-gray-500">Paused</span>
                  </>
                )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">
              Last Update
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {lastUpdate.toLocaleTimeString("en-GB")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search errors (message, file, stack)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {/* Conditional render to prevent hydration mismatch from Radix UI aria-controls */}
            {mounted
              ? (
                <Select
                  value={environment}
                  onValueChange={(v) => setEnvironment(v as ErrorEnvironment | "ALL")}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Environment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="FRONTEND">Frontend</SelectItem>
                    <SelectItem value="BACKEND">Backend</SelectItem>
                  </SelectContent>
                </Select>
              )
              : <div className="h-10 w-[150px] rounded-xl bg-muted/50 animate-pulse" />}
            <Button type="submit" disabled={loading}>
              {loading ? "Loading..." : "Search"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearch("");
                setEnvironment("ALL");
                setPage(1);
              }}
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsPolling(!isPolling)}
            >
              {isPolling ? "Pause" : "Resume"}
            </Button>
            <div className="border-l border-neutral-200 dark:border-neutral-700 pl-4 ml-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={simulateFrontendError}
                className="text-purple-600 border-purple-300 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-700 dark:hover:bg-purple-900/20"
              >
                Test Frontend
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={simulateBackendError}
                className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-900/20"
              >
                Test Backend
              </Button>
            </div>
            <div className="border-l border-neutral-200 dark:border-neutral-700 pl-4 ml-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleClearAll}
                disabled={isClearing || pagination.total === 0}
              >
                {isClearing ? "Clearing..." : "Clear All"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Error List */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-900">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Environment
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Message
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {errors.length === 0
                  ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-neutral-500"
                      >
                        No errors found
                      </td>
                    </tr>
                  )
                  : (
                    errors.map((error) => (
                      <tr
                        key={error.id}
                        className="hover:bg-neutral-900/50"
                      >
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          {formatDate(error.timestamp)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={ENVIRONMENT_COLORS[error.environment]}
                            variant="secondary"
                          >
                            {error.environment}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={ERROR_TYPE_COLORS[
                              error.errorType || "Error"
                            ] ||
                              "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"}
                            variant="secondary"
                          >
                            {error.errorType || "Error"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm max-w-md">
                          <span className="text-red-600 dark:text-red-400">
                            {truncateMessage(error.message)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-xs text-neutral-500">
                          {formatFilePath(error.sourceFile)}
                          {error.sourceLine && `:${error.sourceLine}`}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedError(error)}
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

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-neutral-200 dark:border-neutral-800 px-4 py-3">
              <div className="text-sm text-neutral-500">
                Page {pagination.page} of {pagination.totalPages} (
                {pagination.total} total)
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Detail Dialog */}
      <Dialog
        open={!!selectedError}
        onOpenChange={() => setSelectedError(null)}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-red-500">Error Details</span>
              {selectedError && (
                <Badge
                  className={ENVIRONMENT_COLORS[selectedError.environment]}
                  variant="secondary"
                >
                  {selectedError.environment}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedError && (
            <div className="space-y-4">
              {/* Error Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <span className="text-sm font-medium text-neutral-500">
                    Timestamp
                  </span>
                  <p className="text-sm">
                    {new Date(selectedError.timestamp).toLocaleString("en-GB")}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-neutral-500">
                    Error Type
                  </span>
                  <p className="text-sm">
                    {selectedError.errorType || "Error"}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-neutral-500">
                    Source File
                  </span>
                  <p className="text-sm font-mono break-all">
                    {selectedError.sourceFile || "Unknown"}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-neutral-500">
                    Location
                  </span>
                  <p className="text-sm font-mono">
                    Line {selectedError.sourceLine || "?"}:
                    {selectedError.sourceColumn || "?"}
                    {selectedError.callerName &&
                      ` in ${selectedError.callerName}`}
                  </p>
                </div>
                {selectedError.route && (
                  <div>
                    <span className="text-sm font-medium text-neutral-500">
                      Route
                    </span>
                    <p className="text-sm font-mono">{selectedError.route}</p>
                  </div>
                )}
                {selectedError.userId && (
                  <div>
                    <span className="text-sm font-medium text-neutral-500">
                      User ID
                    </span>
                    <p className="text-sm font-mono">{selectedError.userId}</p>
                  </div>
                )}
                {selectedError.errorCode && (
                  <div>
                    <span className="text-sm font-medium text-neutral-500">
                      Error Code
                    </span>
                    <p className="text-sm font-mono">
                      {selectedError.errorCode}
                    </p>
                  </div>
                )}
              </div>

              {/* Message */}
              <div>
                <span className="text-sm font-medium text-neutral-500">
                  Message
                </span>
                <div className="mt-1 rounded-md bg-red-50 dark:bg-red-900/20 p-3">
                  <p className="text-sm text-red-800 dark:text-red-300 break-all">
                    {selectedError.message}
                  </p>
                </div>
              </div>

              {/* Stack Trace */}
              {selectedError.stack && (
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-500">
                      Stack Trace
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        navigator.clipboard.writeText(
                          selectedError.stack || "",
                        )}
                    >
                      Copy
                    </Button>
                  </div>
                  <pre className="mt-1 rounded-md bg-neutral-100 dark:bg-neutral-900 p-3 text-xs overflow-x-auto max-h-[300px]">
                    {selectedError.stack}
                  </pre>
                </div>
              )}

              {/* Metadata */}
              {selectedError.metadata && (
                <div>
                  <span className="text-sm font-medium text-neutral-500">
                    Metadata
                  </span>
                  <pre className="mt-1 rounded-md bg-neutral-100 dark:bg-neutral-900 p-3 text-xs overflow-x-auto">
                    {JSON.stringify(selectedError.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
