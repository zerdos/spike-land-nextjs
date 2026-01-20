"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { RelayDraft } from "@prisma/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ApprovalActions } from "./approval-actions";
import { DraftEditor } from "./draft-editor";
import { DraftList } from "./draft-list";
import { DraftStatusBadge } from "./draft-status-badge";

interface RelayDraftsPanelProps {
  inboxItemId: string;
}

type DraftWithMetadata = RelayDraft & {
  metadata?: {
    toneMatchScore?: { alignment?: number; };
    characterCount?: number;
    platformLimit?: number;
    withinCharacterLimit?: boolean;
  } | null;
};

interface GenerateDraftsResponse {
  drafts: DraftWithMetadata[];
  messageAnalysis: {
    sentiment: string;
    intent: string;
    urgency: string;
    topics: string[];
    hasQuestion: boolean;
    hasComplaint: boolean;
    needsEscalation: boolean;
  };
}

async function generateDrafts(
  workspaceSlug: string,
  inboxItemId: string,
  customInstructions?: string,
): Promise<GenerateDraftsResponse> {
  const res = await fetch(`/api/orbit/${workspaceSlug}/relay/drafts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      inboxItemId,
      numDrafts: 3,
      customInstructions: customInstructions || undefined,
    }),
  });

  if (!res.ok) {
    let errorText: string;
    try {
      const errorData = await res.json();
      errorText = errorData.error || res.statusText;
    } catch {
      // Intentionally silent: Response body may not be valid JSON - use status text as fallback.
      errorText = res.statusText;
    }
    throw new Error(`Failed to generate drafts: ${errorText}`);
  }

  return res.json();
}

async function regenerateDrafts(
  workspaceSlug: string,
  inboxItemId: string,
  feedback: string,
): Promise<GenerateDraftsResponse> {
  const res = await fetch(`/api/orbit/${workspaceSlug}/relay/drafts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      inboxItemId,
      numDrafts: 3,
      customInstructions: feedback,
    }),
  });

  if (!res.ok) {
    let errorText: string;
    try {
      const errorData = await res.json();
      errorText = errorData.error || res.statusText;
    } catch {
      // Intentionally silent: Response body may not be valid JSON - use status text as fallback.
      errorText = res.statusText;
    }
    throw new Error(`Failed to regenerate drafts: ${errorText}`);
  }

  return res.json();
}

export function RelayDraftsPanel({ inboxItemId }: RelayDraftsPanelProps) {
  const params = useParams();
  const workspaceSlug = params["workspaceSlug"] as string;
  const queryClient = useQueryClient();

  const [selectedDraft, setSelectedDraft] = useState<DraftWithMetadata | null>(
    null,
  );
  const [customInstructions, setCustomInstructions] = useState("");
  const [regenerateFeedback, setRegenerateFeedback] = useState("");
  const [showRegenerateForm, setShowRegenerateForm] = useState(false);

  const generateMutation = useMutation({
    mutationFn: () => generateDrafts(workspaceSlug, inboxItemId, customInstructions),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["relayDrafts", workspaceSlug, inboxItemId],
      });
      setCustomInstructions("");
      // Auto-select the preferred draft
      const preferred = data.drafts.find((d) => d.isPreferred);
      if (preferred) {
        setSelectedDraft(preferred);
      }
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: () => regenerateDrafts(workspaceSlug, inboxItemId, regenerateFeedback),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["relayDrafts", workspaceSlug, inboxItemId],
      });
      setRegenerateFeedback("");
      setShowRegenerateForm(false);
      // Auto-select the preferred draft
      const preferred = data.drafts.find((d) => d.isPreferred);
      if (preferred) {
        setSelectedDraft(preferred);
      }
    },
  });

  const handleSelectDraft = (draft: RelayDraft) => {
    setSelectedDraft(draft as DraftWithMetadata);
  };

  const handleGenerateDrafts = () => {
    generateMutation.mutate();
  };

  const handleRegenerateDrafts = () => {
    if (!regenerateFeedback.trim()) return;
    regenerateMutation.mutate();
  };

  const isGenerating = generateMutation.isPending ||
    regenerateMutation.isPending;

  return (
    <div className="space-y-4" data-testid="relay-drafts-panel">
      {/* Generate Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            AI Draft Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Optional: Add custom instructions for the AI (e.g., 'Include a discount code', 'Keep it brief')..."
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            rows={2}
            disabled={isGenerating}
            data-testid="custom-instructions"
          />
          <Button
            onClick={handleGenerateDrafts}
            disabled={isGenerating}
            data-testid="generate-drafts-button"
          >
            {isGenerating
              ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              )
              : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Drafts
                </>
              )}
          </Button>

          {generateMutation.error && (
            <Alert variant="destructive">
              <AlertDescription>
                {generateMutation.error instanceof Error
                  ? generateMutation.error.message
                  : "Failed to generate drafts"}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Draft List */}
      <div>
        <h3 className="text-sm font-medium mb-2">Generated Drafts</h3>
        <DraftList
          inboxItemId={inboxItemId}
          selectedDraftId={selectedDraft?.id}
          onSelectDraft={handleSelectDraft}
        />
      </div>

      {/* Regenerate Section */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRegenerateForm(!showRegenerateForm)}
          disabled={isGenerating}
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Regenerate with Feedback
        </Button>
      </div>

      {showRegenerateForm && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Textarea
              placeholder="Provide feedback for regeneration (e.g., 'Make it more casual', 'Add more details about our return policy')..."
              value={regenerateFeedback}
              onChange={(e) => setRegenerateFeedback(e.target.value)}
              rows={2}
              disabled={regenerateMutation.isPending}
              data-testid="regenerate-feedback"
            />
            <Button
              onClick={handleRegenerateDrafts}
              disabled={!regenerateFeedback.trim() ||
                regenerateMutation.isPending}
              data-testid="regenerate-drafts-button"
            >
              {regenerateMutation.isPending
                ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Regenerating...
                  </>
                )
                : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate
                  </>
                )}
            </Button>

            {regenerateMutation.error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {regenerateMutation.error instanceof Error
                    ? regenerateMutation.error.message
                    : "Failed to regenerate drafts"}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Selected Draft Detail */}
      {selectedDraft && (
        <>
          <Separator />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Draft Details</span>
                <DraftStatusBadge status={selectedDraft.status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DraftEditor draft={selectedDraft} />
              <Separator />
              <ApprovalActions draft={selectedDraft} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
