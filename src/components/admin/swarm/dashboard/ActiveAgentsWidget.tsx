"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AGENT_STATUS_MAP } from "@/lib/admin/swarm/constants";
import type { AgentStatus } from "@/lib/admin/swarm/types";
import { LiveIndicator } from "../shared/LiveIndicator";
import { WidgetShell } from "./WidgetShell";

interface AgentRow {
  id: string;
  displayName: string;
  status: AgentStatus;
  lastSeenAt: string;
}

const PLACEHOLDER_AGENTS: AgentRow[] = [
  { id: "1", displayName: "build-agent", status: "active", lastSeenAt: "2m ago" },
  { id: "2", displayName: "test-runner", status: "idle", lastSeenAt: "5m ago" },
  { id: "3", displayName: "deploy-bot", status: "active", lastSeenAt: "just now" },
];

function statusColor(status: AgentStatus): "green" | "yellow" | "red" | "gray" {
  const map: Record<AgentStatus, "green" | "yellow" | "red" | "gray"> = {
    active: "green",
    idle: "yellow",
    error: "red",
    stopped: "gray",
  };
  return map[status];
}

export function ActiveAgentsWidget() {
  return (
    <WidgetShell title="Active Agents" span={2}>
      <div className="space-y-3">
        {PLACEHOLDER_AGENTS.map((agent) => (
          <div key={agent.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LiveIndicator color={statusColor(agent.status)} />
              <span className="text-sm font-medium">{agent.displayName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  AGENT_STATUS_MAP[agent.status].color,
                )}
              >
                {AGENT_STATUS_MAP[agent.status].label}
              </Badge>
              <span className="text-xs text-muted-foreground">{agent.lastSeenAt}</span>
            </div>
          </div>
        ))}
      </div>
    </WidgetShell>
  );
}
