"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DraftAuditAction } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle,
  Edit,
  Eye,
  FileText,
  RefreshCw,
  Send,
  XCircle,
} from "lucide-react";
import { useParams } from "next/navigation";

interface AuditLogViewerProps {
  draftId: string;
}

interface AuditLogEntry {
  id: string;
  draftId: string;
  action: DraftAuditAction;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  performedById: string;
  createdAt: string;
  performedBy?: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface DraftWithHistory {
  id: string;
  auditLogs: AuditLogEntry[];
}

const actionConfig: Record<
  DraftAuditAction,
  { icon: React.ComponentType<{ className?: string; }>; label: string; color: string; }
> = {
  CREATED: {
    icon: FileText,
    label: "Created",
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  VIEWED: {
    icon: Eye,
    label: "Viewed",
    color: "bg-gray-100 text-gray-800 border-gray-200",
  },
  EDITED: {
    icon: Edit,
    label: "Edited",
    color: "bg-purple-100 text-purple-800 border-purple-200",
  },
  APPROVED: {
    icon: CheckCircle,
    label: "Approved",
    color: "bg-green-100 text-green-800 border-green-200",
  },
  REJECTED: {
    icon: XCircle,
    label: "Rejected",
    color: "bg-red-100 text-red-800 border-red-200",
  },
  SENT: {
    icon: Send,
    label: "Sent",
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  SEND_FAILED: {
    icon: AlertTriangle,
    label: "Send Failed",
    color: "bg-red-100 text-red-800 border-red-200",
  },
  REGENERATED: {
    icon: RefreshCw,
    label: "Regenerated",
    color: "bg-amber-100 text-amber-800 border-amber-200",
  },
};

async function fetchDraftWithHistory(
  workspaceSlug: string,
  draftId: string,
): Promise<DraftWithHistory> {
  const res = await fetch(
    `/api/orbit/${workspaceSlug}/relay/drafts/${draftId}?includeHistory=true`,
  );

  if (!res.ok) {
    throw new Error("Failed to fetch audit logs");
  }

  return res.json();
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function AuditLogSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AuditLogViewer({ draftId }: AuditLogViewerProps) {
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ["draftAuditLog", workspaceSlug, draftId],
    queryFn: () => fetchDraftWithHistory(workspaceSlug, draftId),
    enabled: !!workspaceSlug && !!draftId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          <AuditLogSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null;
  }

  const auditLogs = data.auditLogs || [];

  if (auditLogs.length === 0) {
    return null;
  }

  return (
    <Card data-testid="audit-log">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Activity Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {auditLogs.map((log, index) => {
            const config = actionConfig[log.action] || actionConfig.VIEWED;
            const Icon = config.icon;
            const isLast = index === auditLogs.length - 1;

            return (
              <div key={log.id} className="relative flex gap-3">
                {/* Timeline connector */}
                {!isLast && <div className="absolute left-4 top-8 bottom-0 w-px bg-border" />}

                {/* Icon */}
                <div
                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border ${config.color}`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs ${config.color}`}>
                      {config.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(log.createdAt)}
                    </span>
                  </div>

                  {log.performedBy && (
                    <p className="text-sm text-muted-foreground mt-1">
                      by {log.performedBy.name || log.performedBy.email || "Unknown"}
                    </p>
                  )}

                  {log.details && Object.keys(log.details).length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded p-2">
                      {log.action === "REJECTED" && !!log.details.reason && (
                        <p>Reason: {String(log.details.reason)}</p>
                      )}
                      {log.action === "SEND_FAILED" && !!log.details.errorMessage && (
                        <p>Error: {String(log.details.errorMessage)}</p>
                      )}
                      {log.action === "EDITED" && !!log.details.editType && (
                        <p>Edit type: {String(log.details.editType)}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
