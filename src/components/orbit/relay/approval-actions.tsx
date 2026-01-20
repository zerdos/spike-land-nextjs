"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { RelayDraft } from "@prisma/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Loader2, Send, XCircle } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

interface ApprovalActionsProps {
  draft: RelayDraft;
  onActionComplete?: () => void;
}

type DraftAction = "approve" | "reject" | "send";

async function performDraftAction(
  workspaceSlug: string,
  draftId: string,
  action: DraftAction,
  reason?: string,
) {
  const body: Record<string, unknown> = { action };
  if (reason) {
    body["reason"] = reason;
  }

  const res = await fetch(
    `/api/orbit/${workspaceSlug}/relay/drafts/${draftId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
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
    throw new Error(`Failed to ${action} draft: ${errorText}`);
  }

  return res.json();
}

export function ApprovalActions(
  { draft, onActionComplete }: ApprovalActionsProps,
) {
  const params = useParams();
  const workspaceSlug = params["workspaceSlug"] as string;
  const queryClient = useQueryClient();

  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: (
      { action, reason }: { action: DraftAction; reason?: string; },
    ) => performDraftAction(workspaceSlug, draft.id, action, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["relayDrafts", workspaceSlug],
      });
      onActionComplete?.();
    },
  });

  const isPending = draft.status === "PENDING";
  const isApproved = draft.status === "APPROVED";
  const isLoading = mutation.isPending;

  const handleApprove = () => {
    mutation.mutate({ action: "approve" });
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) return;
    mutation.mutate({ action: "reject", reason: rejectionReason });
    setRejectDialogOpen(false);
    setRejectionReason("");
  };

  const handleSend = () => {
    mutation.mutate({ action: "send" });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isPending && (
        <>
          <Button
            variant="default"
            size="sm"
            onClick={handleApprove}
            disabled={isLoading}
            data-testid="approve-draft-button"
          >
            {isLoading
              ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              : <CheckCircle className="h-4 w-4 mr-1" />}
            Approve
          </Button>

          <AlertDialog
            open={rejectDialogOpen}
            onOpenChange={setRejectDialogOpen}
          >
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isLoading}
                data-testid="reject-draft-button"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reject Draft</AlertDialogTitle>
                <AlertDialogDescription>
                  Please provide a reason for rejecting this draft. This feedback helps improve
                  future draft generation.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4">
                <Textarea
                  placeholder="Enter rejection reason..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  data-testid="rejection-reason"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleReject();
                  }}
                  disabled={!rejectionReason.trim() || isLoading}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isLoading
                    ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    : null}
                  Reject Draft
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {isApproved && (
        <Button
          variant="default"
          size="sm"
          onClick={handleSend}
          disabled={isLoading}
          data-testid="send-draft-button"
        >
          {isLoading
            ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            : <Send className="h-4 w-4 mr-1" />}
          Send Reply
        </Button>
      )}

      {mutation.error && (
        <p className="text-sm text-red-500 w-full">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Action failed"}
        </p>
      )}
    </div>
  );
}
