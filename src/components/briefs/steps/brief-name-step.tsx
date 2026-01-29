"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBriefStore } from "@/lib/store/brief";
import { useEffect } from "react";

interface BriefNameStepProps {
  onValidChange: (isValid: boolean) => void;
}

export function BriefNameStep({ onValidChange }: BriefNameStepProps) {
  const { briefName, setBriefName } = useBriefStore();

  useEffect(() => {
    onValidChange(briefName.trim().length > 0);
  }, [briefName, onValidChange]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="briefName">Brief Name</Label>
        <Input
          id="briefName"
          placeholder="e.g., Summer 2024 Product Launch Campaign"
          value={briefName}
          onChange={(e) => setBriefName(e.target.value)}
        />
        <p className="text-sm text-muted-foreground">
          Choose a descriptive name that helps identify this brief
        </p>
      </div>
    </div>
  );
}
