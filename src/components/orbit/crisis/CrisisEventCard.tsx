/**
 * Crisis Event Card - Individual crisis event display
 * Resolves #522 (ORB-067): Crisis Detection UI
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const SEVERITY_COLORS = {
  CRITICAL: { bg: "bg-red-100", text: "text-red-800", border: "border-red-200" },
  HIGH: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200" },
  MEDIUM: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-200" },
  LOW: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200" },
};

interface CrisisEventCardProps {
  event: {
    id: string;
    severity: keyof typeof SEVERITY_COLORS;
    status: string;
    triggerType: string;
    triggerData: Record<string, unknown>;
    detectedAt: string;
  };
  workspaceSlug: string;
  onUpdate: () => void;
}

export function CrisisEventCard({ event, workspaceSlug, onUpdate }: CrisisEventCardProps) {
  const [isActing, setIsActing] = useState(false);
  const colors = SEVERITY_COLORS[event.severity];

  const handleAcknowledge = async () => {
    setIsActing(true);
    try {
      const response = await fetch(
        `/api/orbit/${workspaceSlug}/crisis/events/${event.id}/acknowledge`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("Failed to acknowledge");
      toast.success("Crisis acknowledged");
      onUpdate();
    } catch (_error) {
      toast.error("Failed to acknowledge crisis");
    } finally {
      setIsActing(false);
    }
  };

  const handleResolve = async () => {
    setIsActing(true);
    try {
      const response = await fetch(
        `/api/orbit/${workspaceSlug}/crisis/events/${event.id}/resolve`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("Failed to resolve");
      toast.success("Crisis resolved");
      onUpdate();
    } catch (_error) {
      toast.error("Failed to resolve crisis");
    } finally {
      setIsActing(false);
    }
  };

  return (
    <Card className={`${colors.bg} ${colors.border} border-2`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <AlertTriangle className="h-5 w-5" />
              <Badge variant="destructive">{event.severity}</Badge>
              <Badge variant="outline">{event.status}</Badge>
              <Badge variant="secondary">{event.triggerType}</Badge>
            </div>
            <p className="text-sm">
              {(event.triggerData["description"] as string) || "Crisis detected"}
            </p>
            <p className="text-xs text-muted-foreground">
              Detected: {new Date(event.detectedAt).toLocaleString()}
            </p>
          </div>

          <div className="flex gap-2">
            {event.status === "DETECTED" && (
              <Button size="sm" onClick={handleAcknowledge} disabled={isActing}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Acknowledge
              </Button>
            )}
            {event.status === "ACKNOWLEDGED" && (
              <Button size="sm" onClick={handleResolve} disabled={isActing}>
                <XCircle className="h-4 w-4 mr-1" />
                Resolve
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
