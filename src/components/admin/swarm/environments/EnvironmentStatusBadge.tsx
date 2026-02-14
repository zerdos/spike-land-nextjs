"use client";

import { Badge } from "@/components/ui/badge";
import type { EnvironmentStatus } from "@/lib/admin/swarm/types";

const STATUS_CONFIG: Record<EnvironmentStatus, { label: string; variant: "success" | "destructive" | "warning" | "outline" }> = {
  healthy: { label: "Healthy", variant: "success" },
  degraded: { label: "Degraded", variant: "warning" },
  down: { label: "Down", variant: "destructive" },
  deploying: { label: "Deploying", variant: "warning" },
  unknown: { label: "Unknown", variant: "outline" },
};

interface EnvironmentStatusBadgeProps {
  status: EnvironmentStatus;
}

export function EnvironmentStatusBadge({ status }: EnvironmentStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant={config.variant}>{config.label}</Badge>
  );
}
