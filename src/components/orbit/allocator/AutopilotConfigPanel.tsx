"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { AutopilotConfig, UpdateAutopilotConfigInput } from "@/lib/allocator/autopilot-types";
import type { AutopilotMode } from "@prisma/client";
import { useState } from "react";

interface AutopilotConfigPanelProps {
  config: AutopilotConfig | null;
  onSave: (data: UpdateAutopilotConfigInput) => Promise<void>;
}

export function AutopilotConfigPanel({ config, onSave }: AutopilotConfigPanelProps) {
  const [formData, setFormData] = useState<Partial<AutopilotConfig>>(
    config || {
      mode: "CONSERVATIVE",
      maxDailyBudgetChange: 10,
      maxSingleChange: 5,
      pauseOnAnomaly: true,
      requireApprovalAbove: undefined,
    },
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof AutopilotConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Autopilot Configuration</CardTitle>
        <CardDescription>
          Set the rules and safety limits for automatic budget adjustments.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Aggressiveness Mode</Label>
            <Select
              value={formData.mode}
              onValueChange={(val) => updateField("mode", val as AutopilotMode)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CONSERVATIVE">Conservative (Small, safe moves)</SelectItem>
                <SelectItem value="MODERATE">Moderate (Balanced)</SelectItem>
                <SelectItem value="AGGRESSIVE">Aggressive (Maximize growth)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxDaily">Max Daily Budget Change (%)</Label>
              <Input
                id="maxDaily"
                type="number"
                min="1"
                max="100"
                value={formData.maxDailyBudgetChange}
                onChange={(e) => updateField("maxDailyBudgetChange", parseFloat(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxSingle">Max Single Change (%)</Label>
              <Input
                id="maxSingle"
                type="number"
                min="1"
                max="100"
                value={formData.maxSingleChange}
                onChange={(e) => updateField("maxSingleChange", parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="pauseAnomaly" className="flex flex-col space-y-1">
                <span>Pause on Anomaly</span>
                <span className="font-normal text-xs text-muted-foreground">
                  Automatically stop changes if performance metrics spike unexpectedly.
                </span>
              </Label>
              <Switch
                id="pauseAnomaly"
                checked={formData.pauseOnAnomaly}
                onCheckedChange={(checked) => updateField("pauseOnAnomaly", checked)}
              />
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <Label htmlFor="approvalThreshold">Require Approval Above (Amount)</Label>
            <Input
              id="approvalThreshold"
              type="number"
              placeholder="e.g. 500"
              value={formData.requireApprovalAbove || ""}
              onChange={(e) =>
                updateField(
                  "requireApprovalAbove",
                  e.target.value ? parseFloat(e.target.value) : null,
                )}
            />
            <p className="text-xs text-muted-foreground">
              Changes exceeding this absolute amount will require manual approval.
            </p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
