"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  isBuiltIn: boolean;
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

export function SitemapPreviewClient({
  sitemapPaths,
  trackedPaths: initialTrackedPaths,
  origin,
}: SitemapPreviewClientProps) {
  const [trackedPaths, setTrackedPaths] = useState<TrackedPath[]>(initialTrackedPaths);
  const [loadedPaths, setLoadedPaths] = useState<Set<string>>(new Set());
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPath, setNewPath] = useState("");
  const [pathError, setPathError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  // Ref to track loading state without triggering re-renders
  const loadingRef = useRef<Set<string>>(new Set());

  // Create a map of path -> visibility state
  const pathVisibility = useMemo(() => {
    const map = new Map<string, boolean>();
    trackedPaths.forEach((t) => {
      map.set(t.path, t.isActive);
    });
    // All sitemap paths are visible by default unless explicitly hidden
    sitemapPaths.forEach((p) => {
      if (!map.has(p)) {
        map.set(p, true);
      }
    });
    return map;
  }, [trackedPaths, sitemapPaths]);

  // Combine sitemap paths with tracked paths (deduped)
  const allPaths = useMemo(() => {
    const trackedPathStrings = trackedPaths.map((t) => t.path);
    const customPaths = trackedPathStrings.filter(
      (p) => !sitemapPaths.includes(p),
    );
    const combined = [...sitemapPaths, ...customPaths];

    // Filter based on showHidden state
    if (showHidden) {
      return combined;
    } else {
      return combined.filter((p) => pathVisibility.get(p) !== false);
    }
  }, [sitemapPaths, trackedPaths, showHidden, pathVisibility]);

  // Calculate counts for badges
  const visibleCount = useMemo(() => {
    const trackedPathStrings = trackedPaths.map((t) => t.path);
    const customPaths = trackedPathStrings.filter(
      (p) => !sitemapPaths.includes(p),
    );
    const combined = [...sitemapPaths, ...customPaths];
    return combined.filter((p) => pathVisibility.get(p) !== false).length;
  }, [sitemapPaths, trackedPaths, pathVisibility]);

  const hiddenCount = useMemo(() => {
    const trackedPathStrings = trackedPaths.map((t) => t.path);
    const customPaths = trackedPathStrings.filter(
      (p) => !sitemapPaths.includes(p),
    );
    const combined = [...sitemapPaths, ...customPaths];
    return combined.filter((p) => pathVisibility.get(p) === false).length;
  }, [sitemapPaths, trackedPaths, pathVisibility]);

  // Convert path to full URL
  const pathToUrl = useCallback(
    (path: string) => `${origin}${path}`,
    [origin],
  );

  const startLoadingPath = useCallback((path: string) => {
    loadingRef.current.add(path);
    setLoadingPaths(new Set(loadingRef.current));
  }, []);

  const finishLoadingPath = useCallback((path: string) => {
    loadingRef.current.delete(path);
    setLoadingPaths(new Set(loadingRef.current));
    setLoadedPaths((prev) => new Set(prev).add(path));
  }, []);

  useEffect(() => {
    const pathsToLoad = allPaths.filter(
      (path) => !loadedPaths.has(path) && !loadingRef.current.has(path),
    );

    const availableSlots = MAX_CONCURRENT_LOADS - loadingRef.current.size;
    const pathsToStart = pathsToLoad.slice(0, availableSlots);

    pathsToStart.forEach((path) => {
      startLoadingPath(path);
    });
  }, [allPaths, loadedPaths, startLoadingPath]);

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
        { id: data.trackedPath.id, path: data.trackedPath.path },
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
      setLoadedPaths((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
      loadingRef.current.delete(path);
      setLoadingPaths(new Set(loadingRef.current));
    } catch (error) {
      console.error("Failed to delete tracked path:", error);
    }
  };

  const isCustomPath = (path: string) => !sitemapPaths.includes(path);

  const handleToggleVisibility = async (path: string) => {
    const currentVisibility = pathVisibility.get(path) ?? true;
    const newVisibility = !currentVisibility;

    try {
      const response = await fetch("/api/admin/tracked-urls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, isActive: newVisibility }),
      });

      if (!response.ok) {
        console.error("Failed to toggle path visibility");
        return;
      }

      const data = await response.json();

      // Update local state
      setTrackedPaths((prev) => {
        const existing = prev.find((t) => t.path === path);
        if (existing) {
          // Update existing entry
          return prev.map((t) =>
            t.path === path
              ? { ...t, isActive: data.trackedPath.isActive }
              : t,
          );
        } else {
          // Add new entry for built-in path
          return [
            ...prev,
            {
              id: data.trackedPath.id,
              path: data.trackedPath.path,
              isActive: data.trackedPath.isActive,
              isBuiltIn: data.trackedPath.isBuiltIn,
            },
          ];
        }
      });
    } catch (error) {
      console.error("Failed to toggle path visibility:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4" aria-live="polite">
          <Badge variant="secondary">
            {loadedPaths.size} / {allPaths.length} loaded
          </Badge>
          <Badge variant="outline">{loadingPaths.size} loading</Badge>
          <Badge variant="outline">
            {visibleCount} visible / {hiddenCount} hidden
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHidden(!showHidden)}
          >
            {showHidden ? "Hide Hidden Paths" : "Show Hidden Paths"}
          </Button>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add Path</Button>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allPaths.map((path) => {
          const isLoading = loadingPaths.has(path);
          const isLoaded = loadedPaths.has(path);
          const isCustom = isCustomPath(path);
          const isHidden = pathVisibility.get(path) === false;

          return (
            <Card
              key={path}
              className={`overflow-hidden ${isHidden ? "opacity-50 border-dashed" : ""}`}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-medium truncate flex-1">
                    {path}
                  </CardTitle>
                  <div className="flex items-center gap-2 shrink-0">
                    {isCustom && (
                      <Badge variant="outline" className="text-xs">
                        Custom
                      </Badge>
                    )}
                    {isHidden && (
                      <Badge variant="secondary" className="text-xs">
                        Hidden
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                      onClick={() => handleToggleVisibility(path)}
                      aria-label={isHidden ? `Show ${path}` : `Hide ${path}`}
                      title={isHidden ? "Show this path" : "Hide this path"}
                    >
                      {isHidden ? (
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
                        >
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      ) : (
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
                        >
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                          <line x1="2" x2="22" y1="2" y2="22" />
                        </svg>
                      )}
                    </Button>
                    {isCustom && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemovePath(path)}
                        aria-label={`Remove ${path}`}
                      >
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
                        >
                          <path d="M18 6 6 18" />
                          <path d="m6 6 12 12" />
                        </svg>
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="relative w-full h-[300px] bg-muted rounded-lg overflow-hidden">
                  {isLoading && !isLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
                      <div className="flex flex-col items-center gap-2">
                        <svg
                          className="animate-spin h-8 w-8 text-primary"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <span className="text-sm text-muted-foreground">
                          Loading...
                        </span>
                      </div>
                    </div>
                  )}
                  {(isLoading || isLoaded) && (
                    <iframe
                      src={pathToUrl(path)}
                      title={`Preview of ${path}`}
                      className="border-0 origin-top-left"
                      style={{
                        width: "200%",
                        height: "200%",
                        transform: "scale(0.5)",
                      }}
                      sandbox="allow-scripts allow-same-origin"
                      onLoad={() => finishLoadingPath(path)}
                    />
                  )}
                  {!isLoading && !isLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm text-muted-foreground">
                        Queued
                      </span>
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
