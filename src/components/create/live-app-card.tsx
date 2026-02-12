"use client";

import { Eye } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AppCard } from "./app-card";
import { LiveAppPreview } from "./live-app-preview";

interface LiveAppCardProps {
  title: string;
  description: string;
  slug: string;
  codespaceId?: string | null;
  viewCount?: number;
}

export function LiveAppCard({
  title,
  description,
  slug,
  codespaceId,
  viewCount,
}: LiveAppCardProps) {
  const [isHealthy, setIsHealthy] = useState(true);

  if (!codespaceId || !isHealthy) {
    return (
      <AppCard
        title={title}
        description={description}
        slug={slug}
        viewCount={viewCount}
      />
    );
  }

  return (
    <Link
      href={`/create/${slug}`}
      className="group relative block rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm border border-border/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 hover:border-primary/30"
      style={{ viewTransitionName: `app-card-${slug}` }}
    >
      {/* Live preview fills the card */}
      <div className="relative aspect-[4/3] overflow-hidden pointer-events-none">
        <LiveAppPreview
          codespaceId={codespaceId}
          scale={0.35}
          className="w-full h-full"
          fallbackTitle={title}
          onHealthStatus={setIsHealthy}
        />

        {/* Gradient overlay — always visible, darker on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 group-hover:from-black/90 group-hover:via-black/40" />

        {/* Title — visible initially, fades out on hover */}
        <div className="absolute bottom-0 left-0 right-0 p-4 transition-all duration-300 group-hover:opacity-0 group-hover:-translate-y-2">
          <h3 className="text-white font-semibold text-lg leading-tight drop-shadow-lg truncate">
            {title}
          </h3>
          {viewCount !== undefined && (
            <span className="inline-flex items-center gap-1 text-white/70 text-xs mt-1">
              <Eye className="w-3 h-3" />
              {viewCount}
            </span>
          )}
        </div>

        {/* Description — slides up on hover */}
        <div className="absolute inset-x-0 bottom-0 p-4 pt-12 bg-gradient-to-t from-black/95 via-black/80 to-transparent translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0">
          <h3 className="text-white font-semibold text-lg leading-tight drop-shadow-lg truncate mb-2">
            {title}
          </h3>
          <p className="text-white/80 text-sm line-clamp-3 leading-relaxed">
            {description}
          </p>
          <span className="inline-block mt-3 text-xs font-medium text-primary-foreground bg-primary/90 px-3 py-1 rounded-full">
            Open App
          </span>
        </div>
      </div>
    </Link>
  );
}
