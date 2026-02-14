"use client";

import { Badge } from "@/components/ui/badge";
import type { EnvironmentName, EnvironmentStatus } from "@/lib/admin/swarm/types";
import { LiveIndicator } from "../shared/LiveIndicator";
import { WidgetShell } from "./WidgetShell";

interface EnvSummary {
  name: EnvironmentName;
  status: EnvironmentStatus;
  lastDeploy: string;
}

const PLACEHOLDER_ENVS: EnvSummary[] = [
  { name: "dev", status: "healthy", lastDeploy: "10m ago" },
  { name: "preview", status: "deploying", lastDeploy: "2m ago" },
  { name: "prod", status: "healthy", lastDeploy: "3h ago" },
];

function statusIndicatorColor(status: EnvironmentStatus): "green" | "yellow" | "red" | "gray" {
  const map: Record<EnvironmentStatus, "green" | "yellow" | "red" | "gray"> = {
    healthy: "green",
    degraded: "yellow",
    down: "red",
    deploying: "yellow",
    unknown: "gray",
  };
  return map[status];
}

function statusBadgeVariant(status: EnvironmentStatus) {
  if (status === "healthy") return "success" as const;
  if (status === "down") return "destructive" as const;
  if (status === "degraded" || status === "deploying") return "warning" as const;
  return "outline" as const;
}

export function EnvironmentSummaryWidget() {
  return (
    <WidgetShell title="Environments">
      <div className="grid grid-cols-3 gap-4">
        {PLACEHOLDER_ENVS.map((env) => (
          <div key={env.name} className="flex flex-col items-center gap-2 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <LiveIndicator color={statusIndicatorColor(env.status)} />
              <span className="text-sm font-semibold uppercase">{env.name}</span>
            </div>
            <Badge variant={statusBadgeVariant(env.status)}>
              {env.status}
            </Badge>
            <span className="text-xs text-muted-foreground">{env.lastDeploy}</span>
          </div>
        ))}
      </div>
    </WidgetShell>
  );
}
