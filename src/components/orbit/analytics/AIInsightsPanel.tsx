"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AIInsight } from "@/types/analytics";
import { Lightbulb, AlertTriangle, Trophy, TrendingUp } from "lucide-react";

interface AIInsightsPanelProps {
  data: AIInsight[];
}

export function AIInsightsPanel({ data }: AIInsightsPanelProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "OPPORTUNITY":
        return Lightbulb;
      case "WARNING":
        return AlertTriangle;
      case "ACHIEVEMENT":
        return Trophy;
      case "TREND":
        return TrendingUp;
      default:
        return Lightbulb;
    }
  };

  const getVariant = (type: string) => {
    switch (type) {
      case "OPPORTUNITY":
        return "default";
      case "WARNING":
        return "destructive";
      case "ACHIEVEMENT":
        return "secondary";
      case "TREND":
        return "outline";
      default:
        return "default";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Insights</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No insights available yet. Keep posting to generate insights!
          </div>
        ) : (
          <div className="space-y-4">
            {data.slice(0, 5).map((insight) => {
              const Icon = getIcon(insight.type);
              return (
                <div
                  key={insight.id}
                  className="flex gap-4 rounded-lg border p-4"
                >
                  <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold">{insight.title}</h4>
                      <Badge variant={getVariant(insight.type) as any}>
                        {insight.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {insight.description}
                    </p>
                    {insight.recommendation && (
                      <div className="mt-2 rounded bg-muted p-3 text-sm">
                        <span className="font-medium">Recommendation: </span>
                        {insight.recommendation}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
