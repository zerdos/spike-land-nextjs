"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import type { RelayDraft } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { DraftCard } from "./draft-card";

interface DraftListProps {
  inboxItemId: string;
  selectedDraftId?: string | null;
  onSelectDraft: (draft: RelayDraft) => void;
}

type DraftWithMetadata = RelayDraft & {
  metadata?: {
    toneMatchScore?: { alignment?: number; };
    characterCount?: number;
    platformLimit?: number;
    withinCharacterLimit?: boolean;
  } | null;
};

async function fetchDrafts(
  workspaceSlug: string,
  inboxItemId: string,
): Promise<DraftWithMetadata[]> {
  const res = await fetch(
    `/api/orbit/${workspaceSlug}/relay/drafts?inboxItemId=${encodeURIComponent(inboxItemId)}`,
  );

  if (!res.ok) {
    let errorText: string;
    try {
      const errorData = await res.json();
      errorText = errorData.error || res.statusText;
    } catch {
      // Intentionally silent: Response body may not be valid JSON - use status text as fallback.
      errorText = res.statusText;
    }
    throw new Error(`Failed to fetch drafts: ${errorText}`);
  }

  return res.json();
}

function DraftListSkeleton() {
  return (
    <div className="space-y-3" data-testid="draft-list-skeleton">
      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
    </div>
  );
}

export function DraftList(
  { inboxItemId, selectedDraftId, onSelectDraft }: DraftListProps,
) {
  const params = useParams();
  const workspaceSlug = params["workspaceSlug"] as string;

  const {
    data: drafts,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["relayDrafts", workspaceSlug, inboxItemId],
    queryFn: () => fetchDrafts(workspaceSlug, inboxItemId),
    enabled: !!workspaceSlug && !!inboxItemId,
  });

  if (isLoading) {
    return <DraftListSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load drafts"}
        </AlertDescription>
      </Alert>
    );
  }

  if (!drafts || drafts.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No drafts generated yet. Click &quot;Generate Drafts&quot; to create AI-powered response
          suggestions.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3" data-testid="draft-list">
      {drafts.map((draft) => (
        <DraftCard
          key={draft.id}
          draft={draft}
          isSelected={selectedDraftId === draft.id}
          onClick={() => onSelectDraft(draft)}
        />
      ))}
    </div>
  );
}
