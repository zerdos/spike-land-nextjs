"use client";

import { Badge } from "@/components/ui/badge";
import { useCallback, useEffect, useRef, useState } from "react";

// Constants for iframe scaling - full browser dimensions for rendering
const BROWSER_WIDTH = 1920;
const BROWSER_HEIGHT = 1080;

interface MiniPreviewProps {
  codespaceUrl: string;
  versionNumber?: number;
  isLatest: boolean;
  onClick: () => void;
}

/**
 * A scaled-down iframe preview that looks like a browser screenshot.
 * Uses CSS transform: scale() to render full-size content in a small container.
 */
export function MiniPreview({
  codespaceUrl,
  versionNumber,
  isLatest,
  onClick,
}: MiniPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 300, height: 200 });

  // Calculate scale to fit browser content into container
  const scale = Math.min(
    containerSize.width / BROWSER_WIDTH,
    containerSize.height / BROWSER_HEIGHT,
  );

  // Lazy loading via Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "100px" },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Track container size for responsive scaling
  useEffect(() => {
    // Capture ref value at effect start to ensure cleanup works even if ref changes
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const { clientWidth, clientHeight } = container;
      setContainerSize({ width: clientWidth, height: clientHeight });
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.unobserve(container);
      resizeObserver.disconnect();
    };
  }, []);

  const handleClick = useCallback(() => {
    onClick();
  }, [onClick]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick();
      }
    },
    [onClick],
  );

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="mt-3 rounded-xl overflow-hidden border border-white/10 bg-black/30 cursor-pointer hover:border-teal-500/50 transition-all duration-200 group relative max-w-[40vw]"
      style={{ aspectRatio: "16 / 9" }}
      aria-label={`Preview version${versionNumber ? ` ${versionNumber}` : ""} - Click to expand`}
    >
      {/* Browser chrome - traffic lights */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-1.5 px-3 py-2 bg-zinc-900/90 backdrop-blur-sm border-b border-white/5">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#FF5F56]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#27C93F]" />
        </div>
        <div className="flex-1 mx-3">
          <div className="bg-black/30 rounded px-2 py-0.5 max-w-[200px]">
            <span className="text-[9px] text-zinc-500 truncate block font-mono">
              testing.spike.land/live/...
            </span>
          </div>
        </div>
        {/* Version badge */}
        {versionNumber !== undefined && (
          <Badge
            variant="secondary"
            className={`text-[9px] px-1.5 py-0 h-4 ${
              isLatest
                ? "bg-teal-500/20 text-teal-300 border-teal-500/30"
                : "bg-zinc-700/50 text-zinc-400 border-zinc-600/30"
            }`}
          >
            v{versionNumber}
            {isLatest && " (latest)"}
          </Badge>
        )}
      </div>

      {/* Preview content area */}
      <div
        className="relative w-full h-full overflow-hidden"
        style={{ paddingTop: "32px" }} // Account for browser chrome
      >
        {isVisible
          ? (
            <>
              {/* Loading spinner */}
              {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-10 mt-8">
                  <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {/* Scaled iframe */}
              <iframe
                src={codespaceUrl}
                className={`border-0 pointer-events-none transition-opacity duration-300 ${
                  isLoaded ? "opacity-100" : "opacity-0"
                }`}
                style={{
                  width: `${BROWSER_WIDTH}px`,
                  height: `${BROWSER_HEIGHT}px`,
                  transform: `scale(${scale})`,
                  transformOrigin: "0 0",
                  position: "absolute",
                  top: "32px", // Below browser chrome
                  left: 0,
                }}
                title="App Preview"
                sandbox="allow-scripts allow-same-origin"
                loading="lazy"
                onLoad={() => setIsLoaded(true)}
              />
            </>
          )
          : (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-500 mt-8">
              <span className="text-xs">Loading preview...</span>
            </div>
          )}
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center z-30 pointer-events-none">
        <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
          Click to expand
        </span>
      </div>
    </div>
  );
}
