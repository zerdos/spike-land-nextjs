/**
 * Recovery Guidance Panel - Step-by-step recovery instructions
 * Resolves #522 (ORB-066): Account Health Monitor UI
 */

"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

interface RecoveryStep {
  step: number;
  description: string;
  isAutomated: boolean;
}

interface RecoveryGuidancePanelProps {
  issue: string;
  steps: RecoveryStep[];
}

export function RecoveryGuidancePanel({ issue, steps }: RecoveryGuidancePanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recovery Guidance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            <strong>Issue:</strong> {issue}
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.step} className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                {step.step}
              </div>
              <div className="flex-1">
                <p className="text-sm">{step.description}</p>
                {step.isAutomated && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Automated
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
