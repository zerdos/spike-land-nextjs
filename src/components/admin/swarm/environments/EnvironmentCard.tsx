"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EnvironmentInfo } from "@/lib/admin/swarm/types";
import { ExternalLink, GitCommit, Rocket, RotateCcw } from "lucide-react";
import { LiveIndicator } from "../shared/LiveIndicator";
import { TimeAgo } from "../shared/TimeAgo";
import { EnvironmentStatusBadge } from "./EnvironmentStatusBadge";

interface EnvironmentCardProps {
  env: EnvironmentInfo;
  onDeploy?: (env: EnvironmentInfo) => void;
  onRollback?: (env: EnvironmentInfo) => void;
}

function statusIndicatorColor(status: EnvironmentInfo["status"]): "green" | "yellow" | "red" | "gray" {
  const map = {
    healthy: "green",
    degraded: "yellow",
    down: "red",
    deploying: "yellow",
    unknown: "gray",
  } as const;
  return map[status];
}

export function EnvironmentCard({ env, onDeploy, onRollback }: EnvironmentCardProps) {
  return (
    <Card variant="solid">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
        <div className="flex items-center gap-3">
          <LiveIndicator color={statusIndicatorColor(env.status)} />
          <CardTitle className="text-base font-semibold uppercase">{env.name}</CardTitle>
        </div>
        <EnvironmentStatusBadge status={env.status} />
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        {env.commitSha && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <GitCommit className="h-3.5 w-3.5" />
            <code>{env.commitSha.slice(0, 7)}</code>
            {env.version && <span>v{env.version}</span>}
          </div>
        )}
        {env.lastDeployedAt && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Rocket className="h-3.5 w-3.5" />
            <span>Deployed <TimeAgo date={env.lastDeployedAt} /></span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ExternalLink className="h-3.5 w-3.5" />
          <a
            href={env.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {env.url}
          </a>
        </div>
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => onDeploy?.(env)}
          >
            <Rocket className="mr-1 h-3.5 w-3.5" />
            Deploy
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => onRollback?.(env)}
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Rollback
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
