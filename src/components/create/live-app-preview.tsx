"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Code2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const CDN_BASE = "https://testing.spike.land";
const LOAD_TIMEOUT_MS = 15_000;

type LoadState = "idle" | "loading" | "loaded" | "error";

interface LiveAppPreviewProps {
  codespaceId: string;
  scale?: number;
  className?: string;
  lazy?: boolean;
  fallbackTitle?: string;
}

export function LiveAppPreview({
  codespaceId,
  scale,
  className,
  lazy = true,
  fallbackTitle,
}: LiveAppPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<LoadState>("idle");
  const [isVisible, setIsVisible] = useState(!lazy);
  const loadStartedRef = useRef(false);

  const iframeSrc = `${CDN_BASE}/live/${codespaceId}/`;

  const handleLoad = useCallback(() => {
    setState("loaded");
  }, []);

  const handleError = useCallback(() => {
    setState("error");
  }, []);

  // IntersectionObserver for lazy loading
  useEffect(() => {
    if (!lazy || isVisible) return;

    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "50px" },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [lazy, isVisible]);

  // Start loading when visible
  useEffect(() => {
    if (!isVisible || loadStartedRef.current) return;
    loadStartedRef.current = true;
    setState("loading");

    // Timeout fallback
    const timeoutId = setTimeout(() => {
      setState((prev) => (prev === "loading" ? "error" : prev));
    }, LOAD_TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, [isVisible]);

  const isScaled = scale !== undefined && scale !== 1;
  const showIframe = state === "loading" || state === "loaded";

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden", className)}>
      {/* Loading skeleton */}
      {(state === "idle" || state === "loading") && (
        <div className="absolute inset-0 z-10">
          <Skeleton className="w-full h-full" />
        </div>
      )}

      {/* Error fallback — styled placeholder matching app card design */}
      {state === "error" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary/10 via-muted to-primary/5">
          <div className="rounded-full bg-primary/10 p-3">
            <Code2 className="w-8 h-8 text-primary/60" />
          </div>
          {fallbackTitle && (
            <span className="text-sm font-medium text-foreground/70 text-center px-4 line-clamp-2 max-w-[80%]">
              {fallbackTitle}
            </span>
          )}
          <span className="text-xs text-muted-foreground">Preview unavailable</span>
        </div>
      )}

      {/* Seamless iframe */}
      {showIframe && (
        <div
          className="w-full h-full"
          style={isScaled
            ? {
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              width: `${100 / scale}%`,
              height: `${100 / scale}%`,
            }
            : undefined}
        >
          <iframe
            src={iframeSrc}
            className="w-full h-full border-none"
            title={fallbackTitle || `App ${codespaceId}`}
            loading={lazy ? "lazy" : "eager"}
            sandbox="allow-scripts allow-same-origin allow-popups"
            allow="autoplay"
            onLoad={handleLoad}
            onError={handleError}
          />
        </div>
      )}
    </div>
  );
}
