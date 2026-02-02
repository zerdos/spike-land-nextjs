import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { WorkflowNodeData } from "../types";

interface ActionConfigFormProps {
  data: WorkflowNodeData;
  onChange: (data: Partial<WorkflowNodeData>) => void;
}

const ActionConfigForm = ({ data, onChange }: ActionConfigFormProps) => {
  const config = data.config || {};
  const actionType = data.actionType;

  const handleChange = (key: string, value: unknown) => {
    onChange({
      ...data,
      config: { ...config, [key]: value },
    });
  };

  if (actionType === "send_notification") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Recipient</Label>
          <Input
            value={config.recipient || ""}
            onChange={(e) => handleChange("recipient", e.target.value)}
            placeholder="email@example.com or slack-channel"
          />
        </div>
        <div className="space-y-2">
          <Label>Message</Label>
          <Textarea
            value={config.message || ""}
            onChange={(e) => handleChange("message", e.target.value)}
            placeholder="Enter notification message..."
          />
        </div>
      </div>
    );
  }

  if (actionType === "call_ai_agent") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Prompt</Label>
          <Textarea
            value={config.prompt || ""}
            onChange={(e) => handleChange("prompt", e.target.value)}
            placeholder="Describe what the AI should do..."
            className="min-h-[100px]"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 text-center text-sm text-muted-foreground">
      Configuration for {actionType} is coming soon.
    </div>
  );
};

export default ActionConfigForm;
