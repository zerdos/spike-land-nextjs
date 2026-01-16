"use client";

import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ChatMessagePreviewProps {
  codespaceUrl: string;
  timestamp: Date;
  onRestore: () => void;
  isRestoring?: boolean;
}

export function ChatMessagePreview({
  codespaceUrl,
  timestamp,
  onRestore,
  isRestoring = false,
}: ChatMessagePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

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

  const handleRestore = useCallback(() => {
    if (!isRestoring) {
      onRestore();
    }
  }, [onRestore, isRestoring]);

  const formattedTime = new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      ref={containerRef}
      className="mt-3 rounded-xl overflow-hidden border border-white/10 bg-black/20"
    >
      {/* Preview iframe */}
      <div className="relative h-[150px] w-full bg-zinc-900">
        {isVisible
          ? (
            <>
              <iframe
                src={codespaceUrl}
                className={`w-full h-full border-0 transition-opacity duration-300 ${
                  isLoaded ? "opacity-100" : "opacity-0"
                }`}
                title="App Preview"
                sandbox="allow-scripts allow-same-origin"
                onLoad={() => setIsLoaded(true)}
              />
              {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </>
          )
          : (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
              <span className="text-sm">Loading preview...</span>
            </div>
          )}
      </div>

      {/* Footer with restore button */}
      <div className="flex items-center justify-between px-3 py-2 bg-white/5">
        <span className="text-xs text-zinc-400">{formattedTime}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRestore}
          disabled={isRestoring}
          className="h-7 px-2 text-xs text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 gap-1"
        >
          <RotateCcw className={`h-3 w-3 ${isRestoring ? "animate-spin" : ""}`} />
          {isRestoring ? "Restoring..." : "Restore"}
        </Button>
      </div>
    </div>
  );
}
