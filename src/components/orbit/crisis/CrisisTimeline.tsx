/**
 * Crisis Timeline - Visual timeline of crisis events
 * Resolves #522 (ORB-067): Crisis Detection UI
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface TimelineEvent {
  timestamp: string;
  type: string;
  description: string;
  userId?: string;
}

interface CrisisTimelineProps {
  events: TimelineEvent[];
}

export function CrisisTimeline({ events }: CrisisTimelineProps) {
  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={index} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="h-3 w-3 rounded-full bg-primary" />
            {index < events.length - 1 && <div className="w-px h-full bg-border mt-1" />}
          </div>
          <Card className="flex-1">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <Badge variant="outline" className="mb-2">{event.type}</Badge>
                  <p className="text-sm">{event.description}</p>
                </div>
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(event.timestamp).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
