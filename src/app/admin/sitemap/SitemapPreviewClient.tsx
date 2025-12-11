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
import { useCallback, useEffect, useState } from "react";

interface SitemapPreviewClientProps {
  sitemapUrls: string[];
  trackedUrls: string[];
}

const MAX_CONCURRENT_LOADS = 4;

export function SitemapPreviewClient({
  sitemapUrls,
  trackedUrls,
}: SitemapPreviewClientProps) {
  const [allUrls, setAllUrls] = useState<string[]>([
    ...sitemapUrls,
    ...trackedUrls.filter((url) => !sitemapUrls.includes(url)),
  ]);
  const [loadedUrls, setLoadedUrls] = useState<Set<string>>(new Set());
  const [loadingUrls, setLoadingUrls] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [urlError, setUrlError] = useState("");

  const startLoadingUrl = useCallback((url: string) => {
    setLoadingUrls((prev) => new Set(prev).add(url));
  }, []);

  const finishLoadingUrl = useCallback((url: string) => {
    setLoadingUrls((prev) => {
      const next = new Set(prev);
      next.delete(url);
      return next;
    });
    setLoadedUrls((prev) => new Set(prev).add(url));
  }, []);

  useEffect(() => {
    const urlsToLoad = allUrls.filter(
      (url) => !loadedUrls.has(url) && !loadingUrls.has(url),
    );

    const availableSlots = MAX_CONCURRENT_LOADS - loadingUrls.size;
    const urlsToStart = urlsToLoad.slice(0, availableSlots);

    urlsToStart.forEach((url) => {
      startLoadingUrl(url);
    });
  }, [allUrls, loadedUrls, loadingUrls, startLoadingUrl]);

  const handleAddUrl = () => {
    setUrlError("");

    if (!newUrl.trim()) {
      setUrlError("URL is required");
      return;
    }

    try {
      const urlObj = new URL(newUrl.trim());
      if (!urlObj.protocol.startsWith("http")) {
        setUrlError("URL must start with http:// or https://");
        return;
      }
    } catch {
      setUrlError("Invalid URL format");
      return;
    }

    if (allUrls.includes(newUrl.trim())) {
      setUrlError("URL already exists in the list");
      return;
    }

    setAllUrls((prev) => [...prev, newUrl.trim()]);
    setNewUrl("");
    setDialogOpen(false);
  };

  const handleRemoveUrl = (url: string) => {
    if (sitemapUrls.includes(url)) {
      return;
    }
    setAllUrls((prev) => prev.filter((u) => u !== url));
    setLoadedUrls((prev) => {
      const next = new Set(prev);
      next.delete(url);
      return next;
    });
    setLoadingUrls((prev) => {
      const next = new Set(prev);
      next.delete(url);
      return next;
    });
  };

  const isCustomUrl = (url: string) => !sitemapUrls.includes(url);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="secondary">
            {loadedUrls.size} / {allUrls.length} loaded
          </Badge>
          <Badge variant="outline">
            {loadingUrls.size} loading
          </Badge>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add URL</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom URL</DialogTitle>
              <DialogDescription>
                Add a custom URL to preview. This URL will not be added to the permanent sitemap.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                placeholder="https://example.com/page"
                value={newUrl}
                onChange={(e) => {
                  setNewUrl(e.target.value);
                  setUrlError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddUrl();
                  }
                }}
              />
              {urlError && <p className="text-sm text-destructive">{urlError}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddUrl}>Add URL</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allUrls.map((url) => {
          const isLoading = loadingUrls.has(url);
          const isLoaded = loadedUrls.has(url);
          const isCustom = isCustomUrl(url);

          return (
            <Card key={url} className="overflow-hidden">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-medium truncate flex-1">
                    {url.replace("https://spike.land", "")}
                  </CardTitle>
                  <div className="flex items-center gap-2 shrink-0">
                    {isCustom && (
                      <Badge variant="outline" className="text-xs">
                        Custom
                      </Badge>
                    )}
                    {isCustom && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveUrl(url)}
                        aria-label={`Remove ${url}`}
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
                      src={url}
                      title={`Preview of ${url}`}
                      className="border-0 origin-top-left"
                      style={{
                        width: "200%",
                        height: "200%",
                        transform: "scale(0.5)",
                      }}
                      sandbox="allow-scripts allow-same-origin"
                      onLoad={() => finishLoadingUrl(url)}
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
