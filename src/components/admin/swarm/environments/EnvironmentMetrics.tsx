"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { EnvironmentMetricsData } from "@/lib/admin/swarm/types";
import { Activity, AlertTriangle, Clock, TrendingUp } from "lucide-react";

interface EnvironmentMetricsProps {
  metrics: EnvironmentMetricsData;
}

interface MetricItemProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}

function MetricItem({ label, value, icon }: MetricItemProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-md bg-primary/10 p-1.5">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

export function EnvironmentMetrics({ metrics }: EnvironmentMetricsProps) {
  return (
    <Card variant="solid">
      <CardContent className="grid grid-cols-2 gap-4 p-4 lg:grid-cols-4">
        <MetricItem
          label="Requests/min"
          value={metrics.requestsPerMinute.toLocaleString()}
          icon={<Activity className="h-4 w-4 text-primary" />}
        />
        <MetricItem
          label="Avg Response"
          value={`${metrics.avgResponseMs}ms`}
          icon={<Clock className="h-4 w-4 text-blue-500" />}
        />
        <MetricItem
          label="Errors"
          value={metrics.errorCount.toString()}
          icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
        />
        <MetricItem
          label="Uptime"
          value={`${metrics.uptimePercent.toFixed(1)}%`}
          icon={<TrendingUp className="h-4 w-4 text-green-500" />}
        />
      </CardContent>
    </Card>
  );
}
