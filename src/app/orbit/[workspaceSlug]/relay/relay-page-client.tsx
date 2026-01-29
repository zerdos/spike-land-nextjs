/**
 * Relay Page Client Component
 *
 * Client-side component for the Relay approval queue.
 * Resolves #872
 */

"use client";

import { ApprovalQueue } from "@/components/orbit/relay/approval-queue";
import { PostComposer } from "@/components/orbit/composer";
import type { PostData } from "@/components/orbit/composer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Clock, FileCheck, Plus, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface RelayPageClientProps {
  workspaceSlug: string;
}

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

interface RelayMetrics {
  pending: number;
  approved: number;
  rejected: number;
  sent: number;
  averageApprovalTime: number;
}

async function fetchApprovalQueue(
  workspaceSlug: string,
): Promise<ApprovalQueueDraft[]> {
  const res = await fetch(`/api/orbit/${workspaceSlug}/relay/drafts?queue=true`);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || "Failed to fetch approval queue");
  }

  return res.json();
}

/**
 * Computes relay metrics from drafts data.
 * This derives status counts locally instead of relying on a separate API call,
 * as the /relay/metrics endpoint returns different analytics data (rates, etc.)
 */
function computeMetricsFromDrafts(drafts: ApprovalQueueDraft[]): RelayMetrics {
  const pending = drafts.filter((d) => d.status === "PENDING").length;
  const approved = drafts.filter((d) => d.status === "APPROVED").length;
  const rejected = drafts.filter((d) => d.status === "REJECTED").length;
  const sent = drafts.filter((d) => d.status === "SENT").length;

  // Calculate average approval time (time from creation to approval)
  // For now, return 0 as this would require additional timestamp tracking
  const averageApprovalTime = 0;

  return { pending, approved, rejected, sent, averageApprovalTime };
}

function MetricsCards({ metrics }: { metrics: RelayMetrics | undefined; }) {
  const cards = [
    {
      title: "Pending",
      value: metrics?.pending ?? 0,
      icon: Clock,
      color: "text-amber-500",
    },
    {
      title: "Approved",
      value: metrics?.approved ?? 0,
      icon: CheckCircle,
      color: "text-green-500",
    },
    {
      title: "Rejected",
      value: metrics?.rejected ?? 0,
      icon: XCircle,
      color: "text-red-500",
    },
    {
      title: "Avg. Approval Time",
      value: metrics?.averageApprovalTime
        ? `${Math.round(metrics.averageApprovalTime)} min`
        : "N/A",
      icon: FileCheck,
      color: "text-blue-500",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4" data-testid="relay-metrics">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function RelayPageClient({ workspaceSlug }: RelayPageClientProps) {
  const queryClient = useQueryClient();
  const [composerOpen, setComposerOpen] = useState(false);

  const {
    data: drafts,
    isLoading: isDraftsLoading,
    error: draftsError,
  } = useQuery({
    queryKey: ["approvalQueue", workspaceSlug],
    queryFn: () => fetchApprovalQueue(workspaceSlug),
    enabled: !!workspaceSlug,
  });

  // Compute metrics from drafts data instead of separate API call
  // The /relay/metrics endpoint returns analytics data (rates) not status counts
  const metrics = drafts ? computeMetricsFromDrafts(drafts) : undefined;

  const handleDraftActioned = () => {
    queryClient.invalidateQueries({ queryKey: ["approvalQueue", workspaceSlug] });
  };

  const handlePublish = async (_data: PostData) => {
    // TODO: Implement actual publish logic
    // For now, just close the dialog
    // Post will be sent to approval queue
    setComposerOpen(false);
  };

  return (
    <div className="space-y-6" data-testid="relay-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relay</h1>
          <p className="text-muted-foreground">
            Review and approve AI-generated response drafts
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setComposerOpen(true)}
            data-testid="create-post-button"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Post
          </Button>
          <Link
            href={`/orbit/${workspaceSlug}/settings/approvals`}
            className="text-sm text-primary hover:underline"
            data-testid="settings-link"
          >
            Approval Settings
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <MetricsCards metrics={metrics} />

      {/* Approval Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Approval Queue</CardTitle>
              <CardDescription>
                Drafts awaiting review and approval
              </CardDescription>
            </div>
            {drafts && drafts.filter((d) => d.status === "PENDING").length > 0 && (
              <Badge variant="default">
                {drafts.filter((d) => d.status === "PENDING").length} pending
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ApprovalQueue
            drafts={drafts ?? []}
            isLoading={isDraftsLoading}
            error={draftsError as Error | null}
            onDraftActioned={handleDraftActioned}
          />
        </CardContent>
      </Card>

      {/* Post Composer Dialog */}
      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Post</DialogTitle>
          </DialogHeader>
          <PostComposer
            workspaceSlug={workspaceSlug}
            onPublish={handlePublish}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
