/**
 * Approval Queue Component
 *
 * Displays pending drafts for approvers to review and act upon.
 * Resolves #872
 */

"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle, Clock, FileText, Inbox, XCircle } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ApprovalActions } from "./approval-actions";
import { DraftStatusBadge } from "./draft-status-badge";

interface ApprovalQueueDraft {
  id: string;
  content: string;
  confidenceScore: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SENT" | "FAILED";
  createdAt: string;
  inboxItem: {
    id: string;
    platform: string;
    senderName: string;
    senderHandle: string | null;
    content: string;
  };
}

interface ApprovalQueueProps {
  drafts: ApprovalQueueDraft[];
  isLoading?: boolean;
  error?: Error | null;
  onDraftActioned?: () => void;
}

function ApprovalQueueSkeleton() {
  return (
    <div className="space-y-4" data-testid="approval-queue-skeleton">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyQueueState({ status }: { status: string; }) {
  const messages = {
    pending: "No drafts pending approval",
    approved: "No approved drafts",
    rejected: "No rejected drafts",
    all: "No drafts found",
  };

  const icons = {
    pending: Clock,
    approved: CheckCircle,
    rejected: XCircle,
    all: Inbox,
  };

  const Icon = icons[status as keyof typeof icons] || Inbox;
  const message = messages[status as keyof typeof messages] || messages.all;

  return (
    <div
      className="flex flex-col items-center justify-center py-12 text-center"
      data-testid="approval-queue-empty"
    >
      <Icon className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium">{message}</h3>
      <p className="text-sm text-muted-foreground mt-1">
        {status === "pending"
          ? "All drafts have been reviewed"
          : "Drafts will appear here as they are processed"}
      </p>
    </div>
  );
}

function DraftQueueCard({
  draft,
  onActioned,
}: {
  draft: ApprovalQueueDraft;
  onActioned?: () => void;
}) {
  const router = useRouter();
  const params = useParams();
  const workspaceSlug = params["workspaceSlug"];

  // Runtime check for workspaceSlug - component should only be used in workspace routes
  if (!workspaceSlug || typeof workspaceSlug !== "string") {
    console.error("DraftQueueCard: workspaceSlug is required in route params");
    return null;
  }

  const handleViewInInbox = () => {
    router.push(`/orbit/${workspaceSlug}/inbox?itemId=${draft.inboxItem.id}`);
  };

  return (
    <Card data-testid="draft-queue-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {draft.inboxItem.platform.toLowerCase()}
              </Badge>
              <span>{draft.inboxItem.senderName}</span>
              {draft.inboxItem.senderHandle && (
                <span className="text-muted-foreground text-sm">
                  @{draft.inboxItem.senderHandle}
                </span>
              )}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(draft.createdAt), { addSuffix: true })}
            </CardDescription>
          </div>
          <DraftStatusBadge status={draft.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Original Message */}
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Original Message
          </p>
          <p className="text-sm line-clamp-2">{draft.inboxItem.content}</p>
        </div>

        {/* Draft Content */}
        <div className="rounded-lg border p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">
              AI Draft Response
            </p>
            <Badge variant="secondary" className="text-xs">
              {Math.round(draft.confidenceScore * 100)}% confidence
            </Badge>
          </div>
          <p className="text-sm">{draft.content}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewInInbox}
            data-testid="view-in-inbox-button"
          >
            <FileText className="h-4 w-4 mr-1" />
            View in Inbox
          </Button>

          {draft.status === "PENDING" && (
            <ApprovalActions
              draft={{
                id: draft.id,
                content: draft.content,
                confidenceScore: draft.confidenceScore,
                status: draft.status,
                isPreferred: false,
                reason: null,
                metadata: null,
                sentAt: null,
                errorMessage: null,
                inboxItemId: draft.inboxItem.id,
                reviewedById: null,
                reviewedAt: null,
                createdAt: new Date(draft.createdAt),
                updatedAt: new Date(draft.createdAt),
              }}
              onActionComplete={onActioned}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ApprovalQueue({
  drafts,
  isLoading,
  error,
  onDraftActioned,
}: ApprovalQueueProps) {
  const [activeTab, setActiveTab] = useState("pending");

  if (isLoading) {
    return <ApprovalQueueSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="approval-queue-error">
        <AlertDescription>
          {error.message || "Failed to load approval queue"}
        </AlertDescription>
      </Alert>
    );
  }

  const pendingDrafts = drafts.filter((d) => d.status === "PENDING");
  const approvedDrafts = drafts.filter((d) => d.status === "APPROVED");
  const rejectedDrafts = drafts.filter((d) => d.status === "REJECTED");

  return (
    <div className="space-y-4" data-testid="approval-queue">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" data-testid="tab-all">
            All
            <Badge variant="secondary" className="ml-2">
              {drafts.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending
            <Badge
              variant={pendingDrafts.length > 0 ? "default" : "secondary"}
              className="ml-2"
            >
              {pendingDrafts.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">
            Approved
            <Badge variant="secondary" className="ml-2">
              {approvedDrafts.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected">
            Rejected
            <Badge variant="secondary" className="ml-2">
              {rejectedDrafts.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {drafts.length === 0 ? <EmptyQueueState status="all" /> : (
            <div className="space-y-4">
              {drafts.map((draft) => (
                <DraftQueueCard
                  key={draft.id}
                  draft={draft}
                  onActioned={onDraftActioned}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          {pendingDrafts.length === 0
            ? <EmptyQueueState status="pending" />
            : (
              <div className="space-y-4">
                {pendingDrafts.map((draft) => (
                  <DraftQueueCard
                    key={draft.id}
                    draft={draft}
                    onActioned={onDraftActioned}
                  />
                ))}
              </div>
            )}
        </TabsContent>

        <TabsContent value="approved" className="mt-4">
          {approvedDrafts.length === 0
            ? <EmptyQueueState status="approved" />
            : (
              <div className="space-y-4">
                {approvedDrafts.map((draft) => (
                  <DraftQueueCard
                    key={draft.id}
                    draft={draft}
                    onActioned={onDraftActioned}
                  />
                ))}
              </div>
            )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-4">
          {rejectedDrafts.length === 0
            ? <EmptyQueueState status="rejected" />
            : (
              <div className="space-y-4">
                {rejectedDrafts.map((draft) => (
                  <DraftQueueCard
                    key={draft.id}
                    draft={draft}
                    onActioned={onDraftActioned}
                  />
                ))}
              </div>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
