"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { RelayDraft } from "@prisma/client";
import { Sparkles, Star } from "lucide-react";
import { DraftStatusBadge } from "./draft-status-badge";

interface DraftCardProps {
  draft: RelayDraft & {
    metadata?: {
      toneMatchScore?: {
        alignment?: number;
      };
      characterCount?: number;
      platformLimit?: number;
      withinCharacterLimit?: boolean;
    } | null;
  };
  isSelected: boolean;
  onClick: () => void;
}

function ConfidenceScoreBadge({ score }: { score: number; }) {
  const percentage = Math.round(score * 100);
  let color = "bg-gray-100 text-gray-800";

  if (percentage >= 90) {
    color = "bg-green-100 text-green-800 border-green-200";
  } else if (percentage >= 70) {
    color = "bg-blue-100 text-blue-800 border-blue-200";
  } else if (percentage >= 50) {
    color = "bg-yellow-100 text-yellow-800 border-yellow-200";
  } else {
    color = "bg-orange-100 text-orange-800 border-orange-200";
  }

  return (
    <Badge variant="outline" className={`flex items-center gap-1 ${color}`}>
      <Sparkles className="w-3 h-3" />
      <span>{percentage}%</span>
    </Badge>
  );
}

function ToneMatchBadge({ alignment }: { alignment: number; }) {
  const percentage = Math.round(alignment);
  let color = "bg-gray-100 text-gray-800";

  if (percentage >= 80) {
    color = "bg-purple-100 text-purple-800 border-purple-200";
  } else if (percentage >= 60) {
    color = "bg-indigo-100 text-indigo-800 border-indigo-200";
  }

  return (
    <Badge variant="outline" className={`flex items-center gap-1 ${color}`}>
      <span>Tone: {percentage}%</span>
    </Badge>
  );
}

function CharacterLimitBadge({
  count,
  limit,
  withinLimit,
}: {
  count: number;
  limit: number;
  withinLimit: boolean;
}) {
  const color = withinLimit
    ? "bg-gray-100 text-gray-600"
    : "bg-red-100 text-red-800 border-red-200";

  return (
    <Badge variant="outline" className={`text-xs ${color}`}>
      {count}/{limit}
    </Badge>
  );
}

export function DraftCard({ draft, isSelected, onClick }: DraftCardProps) {
  const metadata = draft.metadata as DraftCardProps["draft"]["metadata"];
  const toneAlignment = metadata?.toneMatchScore?.alignment;
  const characterCount = metadata?.characterCount;
  const platformLimit = metadata?.platformLimit;
  const withinCharacterLimit = metadata?.withinCharacterLimit ?? true;

  return (
    <Card
      className={`cursor-pointer transition-colors ${
        isSelected ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"
      }`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      data-testid="draft-card"
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {draft.isPreferred && (
              <div
                className="flex items-center gap-1 text-amber-600 text-xs font-medium mb-2"
                data-testid="draft-card-preferred"
              >
                <Star className="w-3 h-3 fill-current" />
                <span>Recommended</span>
              </div>
            )}
            <p className="text-sm text-gray-700 line-clamp-3">{draft.content}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <DraftStatusBadge status={draft.status} />
          <ConfidenceScoreBadge score={draft.confidenceScore} />
          {toneAlignment !== undefined && <ToneMatchBadge alignment={toneAlignment} />}
          {characterCount !== undefined && platformLimit !== undefined && (
            <CharacterLimitBadge
              count={characterCount}
              limit={platformLimit}
              withinLimit={withinCharacterLimit}
            />
          )}
        </div>

        {draft.reason && (
          <p className="mt-2 text-xs text-muted-foreground italic">
            Rejection reason: {draft.reason}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
