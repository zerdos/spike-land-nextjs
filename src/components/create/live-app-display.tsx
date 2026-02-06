"use client";

import { cn } from "@/lib/utils";
import { ArrowLeft, ExternalLink, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

interface LiveAppDisplayProps {
  codespaceId: string;
  codespaceUrl: string;
  title: string;
  slug: string;
  className?: string;
}

export function LiveAppDisplay({
  codespaceId,
  codespaceUrl,
  title,
  slug,
  className,
}: LiveAppDisplayProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const [loading, setLoading] = useState(true);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    setIframeKey((prev) => prev + 1);
  }, []);

  const iframeSrc = `https://testing.spike.land/live/${codespaceId}/`;

  return (
    <div className={cn("flex flex-col h-[calc(100vh-4rem)] w-full", className)}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-card">
        <div className="flex items-center gap-4">
          <Link
            href="/create"
            className="group/back inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-base shadow-sm hover:shadow-md transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5 transition-transform duration-200 group-hover/back:-translate-x-0.5" />
            <span className="flex flex-col leading-tight">
              <span>All Apps</span>
              <span className="text-[10px] font-normal opacity-75">/create</span>
            </span>
          </Link>
          <div className="h-8 w-px bg-border" />
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-lg">{title}</h1>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full font-mono">
              {slug}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors"
            title="Reload App"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <a
            href={codespaceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      <div className="flex-1 relative bg-white">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        )}
        <iframe
          key={iframeKey}
          src={iframeSrc}
          className="w-full h-full border-none"
          title={title}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          onLoad={() => setLoading(false)}
        />
      </div>
    </div>
  );
}
