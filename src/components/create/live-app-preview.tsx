"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
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

      {/* Error fallback */}
      {state === "error" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-muted/50 text-muted-foreground">
          <AlertTriangle className="w-6 h-6" />
          {fallbackTitle && (
            <span className="text-xs text-center px-2 truncate max-w-full">
              {fallbackTitle}
            </span>
          )}
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
            onLoad={handleLoad}
            onError={handleError}
          />
        </div>
      )}
    </div>
  );
}
