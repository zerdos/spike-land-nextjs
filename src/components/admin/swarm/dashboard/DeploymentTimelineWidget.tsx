"use client";

import { Badge } from "@/components/ui/badge";
import { Rocket } from "lucide-react";
import { WidgetShell } from "./WidgetShell";

interface DeploymentRow {
  id: string;
  env: string;
  commitMessage: string;
  status: "ready" | "building" | "error";
  time: string;
}

const PLACEHOLDER_DEPLOYMENTS: DeploymentRow[] = [
  { id: "1", env: "preview", commitMessage: "feat: add swarm dashboard", status: "building", time: "2m ago" },
  { id: "2", env: "prod", commitMessage: "fix: auth token refresh", status: "ready", time: "3h ago" },
  { id: "3", env: "dev", commitMessage: "chore: update deps", status: "ready", time: "5h ago" },
];

function statusBadgeVariant(status: string) {
  if (status === "ready") return "success" as const;
  if (status === "error") return "destructive" as const;
  return "warning" as const;
}

export function DeploymentTimelineWidget() {
  return (
    <WidgetShell title="Recent Deployments" span={2}>
      <div className="space-y-3">
        {PLACEHOLDER_DEPLOYMENTS.map((deploy) => (
          <div key={deploy.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Rocket className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{deploy.commitMessage}</p>
                <p className="text-xs text-muted-foreground">{deploy.time}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs uppercase">
                {deploy.env}
              </Badge>
              <Badge variant={statusBadgeVariant(deploy.status)} className="text-xs">
                {deploy.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </WidgetShell>
  );
}
