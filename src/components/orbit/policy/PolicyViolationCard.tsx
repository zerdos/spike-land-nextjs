/**
 * Policy Violation Card
 *
 * Displays a single policy violation with details, severity, and suggested fixes.
 * Includes override functionality for authorized users.
 *
 * Resolves #522 (ORB-065): Build Policy Checker UI
 */

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import type { PolicyViolation, PolicySeverity } from "@prisma/client";

interface PolicyViolationCardProps {
  violation: PolicyViolation & {
    rule?: {
      name: string;
      category: string;
      isBlocking: boolean;
    };
  };
  workspaceSlug: string;
  canOverride?: boolean;
  onOverride?: () => void;
}

const SEVERITY_CONFIG: Record<
  PolicySeverity,
  {
    color: "destructive" | "warning" | "default";
    icon: React.ReactNode;
    label: string;
  }
> = {
  CRITICAL: {
    color: "destructive",
    icon: <XCircle className="h-5 w-5" />,
    label: "Critical",
  },
  ERROR: {
    color: "destructive",
    icon: <AlertTriangle className="h-5 w-5" />,
    label: "Error",
  },
  WARNING: {
    color: "warning",
    icon: <AlertTriangle className="h-5 w-5" />,
    label: "Warning",
  },
  INFO: {
    color: "default",
    icon: <CheckCircle className="h-5 w-5" />,
    label: "Info",
  },
};

export function PolicyViolationCard({
  violation,
  workspaceSlug,
  canOverride = false,
  onOverride,
}: PolicyViolationCardProps) {
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [isOverriding, setIsOverriding] = useState(false);

  const severityConfig = SEVERITY_CONFIG[violation.severity];
  const matchLocation = violation.matchLocation as { context?: string } | null;

  const handleOverride = async () => {
    if (!overrideReason.trim()) {
      toast.error("Please provide a reason for the override");
      return;
    }

    setIsOverriding(true);
    try {
      const response = await fetch(
        `/api/orbit/${workspaceSlug}/policy/violations/${violation.id}/override`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: overrideReason,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to override violation");
      }

      toast.success("Violation overridden successfully");
      setOverrideDialogOpen(false);
      setOverrideReason("");
      onOverride?.();
    } catch (error) {
      console.error("Failed to override violation:", error);
      toast.error("Failed to override violation");
    } finally {
      setIsOverriding(false);
    }
  };

  return (
    <>
      <Card className={violation.isOverridden ? "opacity-60" : ""}>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    {severityConfig.icon}
                    <Badge variant={severityConfig.color}>
                      {severityConfig.label}
                    </Badge>
                  </div>
                  <span className="font-semibold">
                    {violation.rule?.name || "Unknown Rule"}
                  </span>
                  {violation.rule?.isBlocking && (
                    <Badge variant="destructive">Blocking</Badge>
                  )}
                  {violation.isOverridden && (
                    <Badge variant="secondary">Overridden</Badge>
                  )}
                </div>

                <p className="text-sm">{violation.message}</p>

                {violation.matchedContent && (
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">
                      Matched Content:
                    </p>
                    <p className="text-sm font-mono">
                      "{violation.matchedContent}"
                    </p>
                  </div>
                )}

                {matchLocation?.context && (
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">
                      Context:
                    </p>
                    <p className="text-sm font-mono">{matchLocation.context}</p>
                  </div>
                )}

                {violation.suggestedFix && (
                  <div className="flex items-start gap-2 text-sm">
                    <span className="font-medium text-muted-foreground">
                      Suggestion:
                    </span>
                    <span>{violation.suggestedFix}</span>
                  </div>
                )}

                {violation.confidence !== null && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Confidence:</span>
                    <div className="flex-1 max-w-xs">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600"
                          style={{
                            width: `${(violation.confidence || 0) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span>{((violation.confidence || 0) * 100).toFixed(0)}%</span>
                  </div>
                )}

                {violation.isOverridden && violation.overrideReason && (
                  <div className="text-sm bg-yellow-50 dark:bg-yellow-950 p-3 rounded-md">
                    <p className="font-medium text-yellow-900 dark:text-yellow-100">
                      Override Reason:
                    </p>
                    <p className="text-yellow-800 dark:text-yellow-200">
                      {violation.overrideReason}
                    </p>
                  </div>
                )}
              </div>

              {canOverride && !violation.isOverridden && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOverrideDialogOpen(true)}
                >
                  Override
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Policy Violation</DialogTitle>
            <DialogDescription>
              You are about to override a policy violation. Please provide a
              clear reason for this override. This action will be logged.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="override-reason">Reason for Override</Label>
              <Textarea
                id="override-reason"
                placeholder="Explain why this violation should be overridden..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={4}
              />
            </div>

            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Violation Details:</p>
              <p>Severity: {violation.severity}</p>
              <p>Rule: {violation.rule?.name || "Unknown"}</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOverrideDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleOverride} disabled={isOverriding}>
              {isOverriding ? "Overriding..." : "Confirm Override"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
