"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRightIcon } from "lucide-react";

interface TopPath {
  path: string[];
  count: number;
}

interface TopPathsListProps {
  paths: TopPath[];
  totalConversions: number;
  className?: string;
}

export function TopPathsList({
  paths,
  totalConversions,
  className,
}: TopPathsListProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Top Conversion Paths</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {paths.map((path, index) => {
            const percentage = totalConversions > 0
              ? (path.count / totalConversions) * 100
              : 0;

            return (
              <div
                key={index}
                className="flex flex-col gap-2 border-b border-dashed pb-3 last:border-0"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {path.count} conversion{path.count !== 1 ? "s" : ""}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {path.path.map((platform, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="rounded-md bg-primary/10 px-3 py-1 text-sm font-medium">
                        {platform}
                      </span>
                      {i < path.path.length - 1 && (
                        <ArrowRightIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {paths.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              No conversion paths found for this period.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
