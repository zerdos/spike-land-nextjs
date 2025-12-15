"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface TrackedPath {
  id: string;
  path: string;
  isActive: boolean;
}

interface SitemapPreviewClientProps {
  sitemapPaths: string[];
  trackedPaths: TrackedPath[];
  origin: string;
}

/**
 * Maximum number of iframes to load concurrently.
 * Limited to prevent browser performance issues and excessive network requests.
 */
const MAX_CONCURRENT_LOADS = 4;

type PathStatus = "queued" | "loading" | "loaded" | "error";

interface PathState {
  status: PathStatus;
  isHidden: boolean;
}

export function SitemapPreviewClient({
  sitemapPaths,
  trackedPaths: initialTrackedPaths,
  origin,
}: SitemapPreviewClientProps) {
  const [trackedPaths, setTrackedPaths] = useState<TrackedPath[]>(
    initialTrackedPaths,
  );
  const [pathStates, setPathStates] = useState<Map<string, PathState>>(
    new Map(),
  );
  const [showHidden, setShowHidden] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPath, setNewPath] = useState("");
  const [pathError, setPathError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ref to track loading state without triggering re-renders
  const loadingRef = useRef<Set<string>>(new Set());

  // Combine sitemap paths with tracked paths (deduped) and build initial state
  const allPaths = useMemo(() => {
    const trackedPathStrings = trackedPaths.map((t) => t.path);
    const customPaths = trackedPathStrings.filter(
      (p) => !sitemapPaths.includes(p),
    );
    return [...sitemapPaths, ...customPaths];
  }, [sitemapPaths, trackedPaths]);

  // Initialize path states with hidden status from DB
  useEffect(() => {
    const newStates = new Map<string, PathState>();
    allPaths.forEach((path) => {
      const tracked = trackedPaths.find((t) => t.path === path);
      const isHidden = tracked ? !tracked.isActive : false;
      newStates.set(path, {
        status: "queued",
        isHidden,
      });
    });
    setPathStates(newStates);
  }, [allPaths, trackedPaths]);

  // Convert path to full URL
  const pathToUrl = useCallback(
    (path: string) => `${origin}${path}`,
    [origin],
  );

  const updatePathStatus = useCallback((path: string, status: PathStatus) => {
    setPathStates((prev) => {
      const newStates = new Map(prev);
      const current = newStates.get(path) ||
        { status: "queued", isHidden: false };
      newStates.set(path, { ...current, status });
      return newStates;
    });
  }, []);

  const startLoadingPath = useCallback((path: string) => {
    loadingRef.current.add(path);
    updatePathStatus(path, "loading");
  }, [updatePathStatus]);

  const finishLoadingPath = useCallback((path: string, success = true) => {
    loadingRef.current.delete(path);
    updatePathStatus(path, success ? "loaded" : "error");
  }, [updatePathStatus]);

  useEffect(() => {
    const pathsToLoad = allPaths.filter((path) => {
      const state = pathStates.get(path);
      return state?.status === "queued" && !loadingRef.current.has(path);
    });

    const availableSlots = MAX_CONCURRENT_LOADS - loadingRef.current.size;
    const pathsToStart = pathsToLoad.slice(0, availableSlots);

    pathsToStart.forEach((path) => {
      startLoadingPath(path);
    });
  }, [allPaths, pathStates, startLoadingPath]);

  const handleAddPath = async () => {
    setPathError("");

    let pathToAdd = newPath.trim();

    if (!pathToAdd) {
      setPathError("Path is required");
      return;
    }

    // If user entered a full URL, extract the path
    if (pathToAdd.includes("://")) {
      try {
        const urlObj = new URL(pathToAdd);
        pathToAdd = urlObj.pathname;
      } catch {
        setPathError("Invalid URL format");
        return;
      }
    }

    // Ensure path starts with /
    if (!pathToAdd.startsWith("/")) {
      pathToAdd = `/${pathToAdd}`;
    }

    if (allPaths.includes(pathToAdd)) {
      setPathError("Path already exists in the list");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/tracked-urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathToAdd }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPathError(data.error || "Failed to add path");
        return;
      }

      // Add to local state
      setTrackedPaths((prev) => [
        {
          id: data.trackedPath.id,
          path: data.trackedPath.path,
          isActive: true,
        },
        ...prev,
      ]);
      setNewPath("");
      setDialogOpen(false);
    } catch {
      setPathError("Failed to add path. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemovePath = async (path: string) => {
    // Find the tracked path to get its ID
    const trackedPath = trackedPaths.find((t) => t.path === path);
    if (!trackedPath) return;

    // Can't remove sitemap paths
    if (sitemapPaths.includes(path)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/tracked-urls?id=${trackedPath.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        console.error("Failed to delete tracked path");
        return;
      }

      // Remove from local state
      setTrackedPaths((prev) => prev.filter((t) => t.id !== trackedPath.id));
      setPathStates((prev) => {
        const next = new Map(prev);
        next.delete(path);
        return next;
      });
      loadingRef.current.delete(path);
    } catch (error) {
      console.error("Failed to delete tracked path:", error);
    }
  };

  const isCustomPath = (path: string) => !sitemapPaths.includes(path);

  const handleToggleVisibility = async (path: string) => {
    const currentState = pathStates.get(path);
    if (!currentState) return;

    const newIsActive = currentState.isHidden; // Toggle: if hidden, make active

    try {
      const response = await fetch("/api/admin/tracked-urls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, isActive: newIsActive }),
      });

      if (!response.ok) {
        console.error("Failed to toggle visibility");
        return;
      }

      // Update local state
      setPathStates((prev) => {
        const next = new Map(prev);
        next.set(path, { ...currentState, isHidden: !newIsActive });
        return next;
      });

      // Update tracked paths if this creates/updates a tracked entry
      const data = await response.json();
      if (data.trackedPath) {
        setTrackedPaths((prev) => {
          const existing = prev.find((t) => t.path === path);
          if (existing) {
            return prev.map((t) => t.path === path ? { ...t, isActive: newIsActive } : t);
          } else {
            return [
              ...prev,
              { id: data.trackedPath.id, path, isActive: newIsActive },
            ];
          }
        });
      }
    } catch (error) {
      console.error("Failed to toggle visibility:", error);
    }
  };

  const handleRefreshPath = (path: string) => {
    updatePathStatus(path, "queued");
    loadingRef.current.delete(path);
  };

  const handleRefreshAll = () => {
    allPaths.forEach((path) => {
      updatePathStatus(path, "queued");
    });
    loadingRef.current.clear();
  };

  // Filter paths based on visibility
  const visiblePaths = useMemo(() => {
    return allPaths.filter((path) => {
      const state = pathStates.get(path);
      if (!state) return true;
      return showHidden || !state.isHidden;
    });
  }, [allPaths, pathStates, showHidden]);

  // Calculate stats
  const stats = useMemo(() => {
    let healthy = 0;
    let loading = 0;
    let errors = 0;
    let hidden = 0;

    pathStates.forEach((state) => {
      if (state.isHidden) hidden++;
      else if (state.status === "loaded") healthy++;
      else if (state.status === "loading") loading++;
      else if (state.status === "error") errors++;
    });

    return {
      healthy,
      loading,
      errors,
      hidden,
      visible: allPaths.length - hidden,
    };
  }, [pathStates, allPaths.length]);

  return (
    <div className="space-y-6">
      {/* Command Center Header & Toolbar */}
      <div className="space-y-4">
        {/* Health Status Bar */}
        <div className="flex items-center gap-3 flex-wrap" aria-live="polite">
          <Badge
            variant="outline"
            className="bg-green-500/10 text-green-500 border-green-500/20"
          >
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
            {stats.healthy} Healthy
          </Badge>
          {stats.loading > 0 && (
            <Badge
              variant="outline"
              className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
            >
              <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
              {stats.loading} Loading
            </Badge>
          )}
          {stats.errors > 0 && (
            <Badge
              variant="outline"
              className="bg-red-500/10 text-red-500 border-red-500/20"
            >
              <div className="w-2 h-2 rounded-full bg-red-500 mr-2" />
              {stats.errors} Error
            </Badge>
          )}
          <Badge variant="secondary">
            {stats.visible} visible / {stats.hidden} hidden
          </Badge>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={showHidden ? "default" : "outline"}
              size="sm"
              onClick={() => setShowHidden(!showHidden)}
            >
              {showHidden ? "Hide Hidden Paths" : "Show Hidden Paths"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefreshAll}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 16h5v5" />
              </svg>
              Refresh All
            </Button>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2"
                >
                  <path d="M5 12h14" />
                  <path d="M12 5v14" />
                </svg>
                Add Custom Path
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Custom Path</DialogTitle>
                <DialogDescription>
                  Add a custom path to preview. The path will be persisted to the database and
                  available across environments.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input
                  placeholder="/custom-page"
                  value={newPath}
                  onChange={(e) => {
                    setNewPath(e.target.value);
                    setPathError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isSubmitting) {
                      handleAddPath();
                    }
                  }}
                  disabled={isSubmitting}
                />
                {pathError && <p className="text-sm text-destructive">{pathError}</p>}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddPath} disabled={isSubmitting}>
                  {isSubmitting ? "Adding..." : "Add Path"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {visiblePaths.map((path) => {
          const state = pathStates.get(path) ||
            { status: "queued", isHidden: false };
          const isCustom = isCustomPath(path);

          return (
            <Card
              key={path}
              className={`overflow-hidden transition-opacity ${
                state.isHidden ? "opacity-50 border-dashed" : ""
              }`}
            >
              {/* Card Header with Status & Actions */}
              <div className="bg-zinc-800 border-b border-zinc-700 px-3 py-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {/* Status Indicator Dot */}
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      state.status === "loaded"
                        ? "bg-green-500"
                        : state.status === "loading"
                        ? "bg-yellow-500 animate-pulse"
                        : state.status === "error"
                        ? "bg-red-500"
                        : "bg-zinc-500"
                    }`}
                    title={state.status}
                  />
                  {/* Path Name */}
                  <span className="text-xs font-medium truncate" title={path}>
                    {path}
                  </span>
                </div>

                {/* Action Buttons (Hover Reveal) */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Refresh Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => handleRefreshPath(path)}
                    title="Reload this iframe"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                      <path d="M16 16h5v5" />
                    </svg>
                  </Button>

                  {/* External Link Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => window.open(pathToUrl(path), "_blank")}
                    title="Open in new tab"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" x2="21" y1="14" y2="3" />
                    </svg>
                  </Button>

                  {/* Visibility Toggle Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => handleToggleVisibility(path)}
                    title={state.isHidden ? "Show this path" : "Hide this path"}
                  >
                    {state.isHidden
                      ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      )
                      : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                  </Button>

                  {/* Delete Button (Custom Paths Only) */}
                  {isCustom && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemovePath(path)}
                      title="Delete custom path"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </Button>
                  )}
                </div>
              </div>

              {/* Iframe Container */}
              <CardContent className="p-0">
                <div className="relative w-full aspect-[4/3] bg-zinc-900 overflow-hidden">
                  {/* Loading State */}
                  {state.status === "loading" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/90 z-10 backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
                        <span className="text-xs text-zinc-500">
                          Loading...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Error State */}
                  {state.status === "error" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-950/20 border border-red-900/50">
                      <div className="flex flex-col items-center gap-2 text-center p-4">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-red-500"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span className="text-xs text-red-400">
                          Failed to load
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Queued State */}
                  {state.status === "queued" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                      <span className="text-xs text-zinc-600">Queued...</span>
                    </div>
                  )}

                  {/* Iframe with Scaling */}
                  {(state.status === "loading" || state.status === "loaded") &&
                    (
                      <iframe
                        src={pathToUrl(path)}
                        title={`Preview of ${path}`}
                        className="border-0 origin-top-left pointer-events-none"
                        style={{
                          width: "400%",
                          height: "400%",
                          transform: "scale(0.25)",
                        }}
                        sandbox="allow-scripts allow-same-origin"
                        onLoad={() => finishLoadingPath(path, true)}
                        onError={() => finishLoadingPath(path, false)}
                      />
                    )}

                  {/* Hidden Badge Overlay */}
                  {state.isHidden && (
                    <div className="absolute top-2 right-2 z-20">
                      <Badge variant="secondary" className="text-xs">
                        Hidden
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
