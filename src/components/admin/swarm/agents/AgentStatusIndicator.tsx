"use client";

import type { AgentStatus } from "@/lib/admin/swarm/types";
import { LiveIndicator } from "../shared/LiveIndicator";

const STATUS_COLOR_MAP: Record<AgentStatus, "green" | "yellow" | "red" | "gray"> = {
  active: "green",
  idle: "yellow",
  error: "red",
  stopped: "gray",
};

interface AgentStatusIndicatorProps {
  status: AgentStatus;
  className?: string;
}

export function AgentStatusIndicator({ status, className }: AgentStatusIndicatorProps) {
  return <LiveIndicator color={STATUS_COLOR_MAP[status]} className={className} />;
}
