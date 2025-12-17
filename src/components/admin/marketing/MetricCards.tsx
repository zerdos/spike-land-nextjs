"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

export interface MetricCardData {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
}

interface MetricCardsProps {
  metrics: MetricCardData[];
  className?: string;
  loading?: boolean;
}

function formatValue(value: string | number): string {
  if (typeof value === "number") {
    return value.toLocaleString();
  }
  return value;
}

function getTrendIcon(change: number) {
  if (change > 0) {
    return <ArrowUp className="h-3 w-3" />;
  }
  if (change < 0) {
    return <ArrowDown className="h-3 w-3" />;
  }
  return <Minus className="h-3 w-3" />;
}

function getTrendVariant(change: number): "default" | "destructive" | "secondary" {
  if (change > 0) {
    return "default";
  }
  if (change < 0) {
    return "destructive";
  }
  return "secondary";
}

export function MetricCard({ metric, loading }: { metric: MetricCardData; loading?: boolean; }) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3 w-16 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
        {metric.change !== undefined && (
          <Badge
            variant={getTrendVariant(metric.change)}
            className="flex items-center gap-1"
          >
            {getTrendIcon(metric.change)}
            {metric.change > 0 ? "+" : ""}
            {metric.change.toFixed(1)}%
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          {metric.icon && <span className="text-muted-foreground">{metric.icon}</span>}
          <div className="text-2xl font-bold">{formatValue(metric.value)}</div>
        </div>
        {metric.changeLabel && (
          <p className="mt-1 text-xs text-muted-foreground">
            {metric.changeLabel}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function MetricCards({ metrics, className, loading }: MetricCardsProps) {
  return (
    <div
      className={cn(
        "grid gap-4 md:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {metrics.map((metric, index) => (
        <MetricCard key={metric.title || index} metric={metric} loading={loading} />
      ))}
    </div>
  );
}
