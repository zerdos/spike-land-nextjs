"use client";

import { Badge } from "@/components/ui/badge";
import type { RelayDraftStatus } from "@prisma/client";
import { AlertTriangle, CheckCircle, Clock, Send, XCircle } from "lucide-react";

interface DraftStatusBadgeProps {
  status: RelayDraftStatus;
  className?: string;
}

const statusConfig: Record<
  RelayDraftStatus,
  { label: string; icon: React.ComponentType<{ className?: string; }>; color: string; }
> = {
  PENDING: {
    label: "Pending",
    icon: Clock,
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  APPROVED: {
    label: "Approved",
    icon: CheckCircle,
    color: "bg-green-100 text-green-800 border-green-200",
  },
  REJECTED: {
    label: "Rejected",
    icon: XCircle,
    color: "bg-red-100 text-red-800 border-red-200",
  },
  SENT: {
    label: "Sent",
    icon: Send,
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  FAILED: {
    label: "Failed",
    icon: AlertTriangle,
    color: "bg-red-100 text-red-800 border-red-200",
  },
};

export function DraftStatusBadge({ status, className }: DraftStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.PENDING;
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={`flex items-center gap-1 ${config.color} ${className ?? ""}`}
      data-testid="draft-status-badge"
    >
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </Badge>
  );
}
