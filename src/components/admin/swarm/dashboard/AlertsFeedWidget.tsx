"use client";

import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { WidgetShell } from "./WidgetShell";

interface AlertItem {
  id: string;
  level: "error" | "warning" | "info";
  message: string;
  time: string;
}

const PLACEHOLDER_ALERTS: AlertItem[] = [
  { id: "1", level: "error", message: "Build failed on preview", time: "3m ago" },
  { id: "2", level: "warning", message: "High memory usage on prod", time: "15m ago" },
  { id: "3", level: "info", message: "Agent deploy-bot connected", time: "22m ago" },
];

const LEVEL_CONFIG = {
  error: { icon: AlertCircle, color: "text-red-500" },
  warning: { icon: AlertTriangle, color: "text-yellow-500" },
  info: { icon: Info, color: "text-blue-500" },
} as const;

export function AlertsFeedWidget() {
  return (
    <WidgetShell title="Recent Alerts">
      <div className="space-y-3">
        {PLACEHOLDER_ALERTS.map((alert) => {
          const config = LEVEL_CONFIG[alert.level];
          const Icon = config.icon;
          return (
            <div key={alert.id} className="flex items-start gap-3">
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", config.color)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">{alert.message}</p>
                <p className="text-xs text-muted-foreground">{alert.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </WidgetShell>
  );
}
