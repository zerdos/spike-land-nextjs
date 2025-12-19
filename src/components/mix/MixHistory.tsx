"use client";

import { Badge } from "@/components/ui/badge";
import { type MixHistoryItem, useMixHistory } from "@/hooks/useMixHistory";
import { cn } from "@/lib/utils";
import { ArrowRight, Loader2 } from "lucide-react";
import Image from "next/image";
import { useCallback } from "react";

const tierLabels: Record<string, string> = {
  TIER_1K: "1K",
  TIER_2K: "2K",
  TIER_4K: "4K",
};

const tierStyles: Record<string, string> = {
  TIER_1K: "bg-green-500/20 text-green-400 border-green-500/30",
  TIER_2K: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  TIER_4K: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

interface MixHistoryProps {
  onMixClick?: (mix: MixHistoryItem) => void;
}

export function MixHistory({ onMixClick }: MixHistoryProps) {
  const { mixes, isLoading, error, refetch } = useMixHistory(20);

  const handleMixClick = useCallback(
    (mix: MixHistoryItem) => {
      onMixClick?.(mix);
    },
    [onMixClick],
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium">History</h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium">History</h3>
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-sm text-primary hover:underline mt-2"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (mixes.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium">History</h3>
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            No mixes yet. Create your first mix above.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">History</h3>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
        {mixes.map((mix) => (
          <button
            key={mix.id}
            type="button"
            onClick={() => handleMixClick(mix)}
            className={cn(
              "flex-shrink-0 rounded-lg overflow-hidden",
              "border border-border hover:border-primary",
              "transition-all focus:outline-none focus:ring-2 focus:ring-primary",
              "bg-card",
            )}
          >
            <div className="flex items-center gap-1 p-2">
              {/* Source 1 thumbnail */}
              <div className="relative w-12 h-12 rounded overflow-hidden bg-muted">
                {mix.targetImage
                  ? (
                    <Image
                      src={mix.targetImage.url}
                      alt={mix.targetImage.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  )
                  : <div className="absolute inset-0 bg-muted" />}
              </div>

              {/* Arrow */}
              <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />

              {/* Source 2 thumbnail */}
              <div className="relative w-12 h-12 rounded overflow-hidden bg-muted">
                {mix.sourceImage
                  ? (
                    <Image
                      src={mix.sourceImage.url}
                      alt={mix.sourceImage.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  )
                  : <div className="absolute inset-0 bg-muted" />}
              </div>

              {/* Result thumbnail */}
              <span className="text-muted-foreground mx-1">=</span>
              <div className="relative w-12 h-12 rounded overflow-hidden bg-muted">
                {mix.resultUrl
                  ? (
                    <Image
                      src={mix.resultUrl}
                      alt="Mix result"
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  )
                  : (
                    <div className="absolute inset-0 bg-muted flex items-center justify-center">
                      {mix.status === "PROCESSING" || mix.status === "PENDING"
                        ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        : (
                          <span className="text-xs text-muted-foreground">
                            -
                          </span>
                        )}
                    </div>
                  )}
              </div>
            </div>

            {/* Footer with date and tier */}
            <div className="px-2 pb-2 flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {new Date(mix.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <Badge
                variant="outline"
                className={cn("text-xs", tierStyles[mix.tier])}
              >
                {tierLabels[mix.tier]}
              </Badge>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
