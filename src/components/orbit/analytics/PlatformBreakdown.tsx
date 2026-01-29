"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlatformMetrics } from "@/types/analytics";

interface PlatformBreakdownProps {
  data: PlatformMetrics[];
}

export function PlatformBreakdown({ data }: PlatformBreakdownProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No platform data available yet
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.map((platform) => (
              <div key={platform.platform} className="rounded-lg border p-4">
                <h4 className="font-semibold mb-2">{platform.platform}</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Posts:</span>
                    <span className="font-medium">{platform.posts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Engagements:</span>
                    <span className="font-medium">
                      {platform.engagements.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Rate:</span>
                    <span className="font-medium">
                      {platform.averageEngagementRate.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
