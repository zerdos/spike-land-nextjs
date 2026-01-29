/**
 * Crisis Event List - List and filter crisis events
 * Resolves #522 (ORB-067): Crisis Detection UI
 */

"use client";

import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CrisisEventCard } from "./CrisisEventCard";

interface CrisisEvent {
  id: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "DETECTED" | "ACKNOWLEDGED" | "RESOLVED" | "FALSE_ALARM";
  triggerType: string;
  triggerData: Record<string, unknown>;
  detectedAt: string;
}

interface CrisisEventListProps {
  workspaceSlug: string;
}

export function CrisisEventList({ workspaceSlug }: CrisisEventListProps) {
  const [events, setEvents] = useState<CrisisEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const fetchEvents = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (severityFilter !== "all") params.set("severity", severityFilter);

      const response = await fetch(
        `/api/orbit/${workspaceSlug}/crisis/events?${params.toString()}`,
      );
      if (!response.ok) throw new Error("Failed to fetch events");
      const data = await response.json();
      setEvents(data.events || []);
    } catch (_error) {
      toast.error("Failed to load crisis events");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceSlug, statusFilter, severityFilter]);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchEvents]);

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="DETECTED">Detected</SelectItem>
            <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="FALSE_ALARM">False Alarm</SelectItem>
          </SelectContent>
        </Select>

        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="CRITICAL">Critical</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {isLoading
          ? <p className="text-center py-8 text-muted-foreground">Loading events...</p>
          : events.length === 0
          ? (
            <Card className="p-6 text-center text-muted-foreground">
              No crisis events found
            </Card>
          )
          : (
            events.map((event) => (
              <CrisisEventCard
                key={event.id}
                event={event}
                workspaceSlug={workspaceSlug}
                onUpdate={fetchEvents}
              />
            ))
          )}
      </div>
    </div>
  );
}
