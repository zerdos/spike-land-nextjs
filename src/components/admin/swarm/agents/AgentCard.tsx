"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AGENT_STATUS_MAP } from "@/lib/admin/swarm/constants";
import type { SwarmAgent } from "@/lib/admin/swarm/types";
import { cn } from "@/lib/utils";
import { Square, Terminal } from "lucide-react";
import { TimeAgo } from "../shared/TimeAgo";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { AgentStatusIndicator } from "./AgentStatusIndicator";

interface AgentCardProps {
  agent: SwarmAgent;
  onStop?: (agentId: string) => void;
}

export function AgentCard({ agent, onStop }: AgentCardProps) {
  const statusConfig = AGENT_STATUS_MAP[agent.status];

  return (
    <Card variant="solid">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
        <div className="flex items-center gap-3">
          <AgentStatusIndicator status={agent.status} />
          <CardTitle className="text-sm font-semibold">{agent.displayName}</CardTitle>
        </div>
        <Badge
          variant="outline"
          className={cn("text-xs", statusConfig.color)}
        >
          {statusConfig.label}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Terminal className="h-3.5 w-3.5" />
          <span>Session: {agent.sessionId.slice(0, 8)}</span>
        </div>
        {agent.lastSeenAt && (
          <p className="text-xs text-muted-foreground">
            Last seen <TimeAgo date={agent.lastSeenAt} />
          </p>
        )}
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>{agent.totalTasksCompleted} tasks</span>
          <span>{agent.messageCount} messages</span>
        </div>
        {agent.status !== "stopped" && onStop && (
          <div className="pt-2">
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="outline" className="w-full">
                  <Square className="mr-1 h-3.5 w-3.5" />
                  Stop Agent
                </Button>
              }
              title="Stop Agent"
              description={`Are you sure you want to stop "${agent.displayName}"? This will end the agent's session.`}
              confirmLabel="Stop"
              onConfirm={() => onStop(agent.id)}
              variant="destructive"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
