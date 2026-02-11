"use client";

import { cn } from "@/lib/utils";
import { ExternalLink, RefreshCw } from "lucide-react";
import { useState } from "react";

interface AppDisplayProps {
  url: string;
  title: string;
  className?: string;
  slug: string;
}

export function AppDisplay({ url, title, className, slug }: AppDisplayProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const [loading, setLoading] = useState(true);

  const handleRefresh = () => {
    setLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className={cn("flex flex-col h-[calc(100vh-4rem)] w-full", className)}>
      <div className="flex items-center justify-between px-6 py-3 border-b bg-card">
        <div className="flex items-center gap-4">
          <h1 className="font-semibold text-lg">{title}</h1>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full font-mono">
            {slug}
          </span>
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
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      <div className="flex-1 relative bg-muted/20">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        )}
        <iframe
          key={iframeKey}
          src={url}
          className="w-full h-full border-none"
          title={title}
          allow="accelerometer; autoplay; camera; encrypted-media; geolocation; gyroscope; microphone; midi; clipboard-read; clipboard-write"
          allowFullScreen
          onLoad={() => setLoading(false)}
        />
      </div>
    </div>
  );
}
