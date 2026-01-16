"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface GuardrailAlert {
  id: string;
  alertType: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  message: string;
  createdAt: string;
  campaign?: { name: string; };
}

interface GuardrailAlertsPanelProps {
  workspaceSlug: string;
  workspaceId: string;
}

export function GuardrailAlertsPanel(
  { workspaceSlug, workspaceId }: GuardrailAlertsPanelProps,
) {
  const [alerts, setAlerts] = useState<GuardrailAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch(
          `/api/orbit/${workspaceSlug}/allocator/autopilot/alerts?workspaceId=${workspaceId}`,
        );
        if (res.ok) {
          setAlerts(await res.json());
        }
      } catch (_error) {
        console.error(_error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlerts();
    // Poll every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [workspaceSlug, workspaceId]);

  const handleAcknowledge = async (alertId: string) => {
    try {
      const res = await fetch(
        `/api/orbit/${workspaceSlug}/allocator/autopilot/alerts`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alertId }),
        },
      );
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
        toast.success("Alert acknowledged");
      }
    } catch (_error) {
      toast.error("Failed to acknowledge");
    }
  };

  if (alerts.length === 0 && !isLoading) {
    return null; // Don't show if no alerts
  }

  return (
    <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/10 dark:border-orange-900">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          Guardrail Alerts
          <Badge variant="secondary" className="ml-2">{alerts.length}</Badge>
        </CardTitle>
        <CardDescription>
          Potential issues blocked by safety guardrails.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px] pr-4">
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start justify-between p-3 bg-white dark:bg-card rounded-lg border shadow-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={alert.severity === "CRITICAL"
                        ? "destructive"
                        : alert.severity === "WARNING"
                        ? "default"
                        : "secondary"}
                    >
                      {alert.alertType.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(alert.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{alert.message}</p>
                  {alert.campaign && (
                    <p className="text-xs text-muted-foreground">
                      Campaign: {alert.campaign.name}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={() => handleAcknowledge(alert.id)}
                  title="Acknowledge"
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
