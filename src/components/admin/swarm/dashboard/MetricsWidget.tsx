"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { ReactNode } from "react";
import { AlertCircle, Bot, Rocket, TrendingUp } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
}

function MetricCard({ label, value, icon, trend }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="rounded-lg bg-primary/10 p-2">{icon}</div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {trend && (
            <p className="text-xs text-muted-foreground">{trend}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricsWidget() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <MetricCard
        label="Active Agents"
        value={3}
        icon={<Bot className="h-5 w-5 text-primary" />}
        trend="+2 today"
      />
      <MetricCard
        label="Deployments"
        value={12}
        icon={<Rocket className="h-5 w-5 text-green-500" />}
        trend="Today"
      />
      <MetricCard
        label="Open Issues"
        value={7}
        icon={<AlertCircle className="h-5 w-5 text-yellow-500" />}
      />
      <MetricCard
        label="Error Rate"
        value="0.3%"
        icon={<TrendingUp className="h-5 w-5 text-red-500" />}
        trend="Last 24h"
      />
    </div>
  );
}
