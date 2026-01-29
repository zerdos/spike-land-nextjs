"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GrowthData } from "@/types/analytics";

interface GrowthChartProps {
  data: GrowthData[];
}

export function GrowthChart({ data }: GrowthChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Growth Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground py-8">
          {data.length === 0 ? "No growth data available yet" : `Showing ${data.length} data points`}
        </div>
      </CardContent>
    </Card>
  );
}
