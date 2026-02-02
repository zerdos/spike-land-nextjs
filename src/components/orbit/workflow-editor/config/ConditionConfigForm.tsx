import React from "react";
import type { WorkflowNode } from "../types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ConditionConfigFormProps {
  node: WorkflowNode;
  onChange: (data: unknown) => void;
}

const ConditionConfigForm = ({ node, onChange }: ConditionConfigFormProps) => {
  const handleChange = (field: string, value: unknown) => {
    onChange({
      ...node.data,
      config: {
        ...node.data.config,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="expression">Condition Expression</Label>
        <Input
            value={(node.data.config?.expression as string) || ""}
            onChange={(e) => handleChange("expression", e.target.value)}
            placeholder="e.g. {{trigger.value}} > 10"
        />
      </div>
      <div className="text-xs text-muted-foreground">
        Use simple expressions to determine which path to take.
      </div>
    </div>
  );
};

export default ConditionConfigForm;
