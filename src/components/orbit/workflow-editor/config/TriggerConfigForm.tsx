import React from "react";
import { WorkflowNode } from "../types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CronPicker from "./CronPicker";

interface TriggerConfigFormProps {
  node: WorkflowNode;
  onChange: (data: any) => void;
}

const TriggerConfigForm = ({ node, onChange }: TriggerConfigFormProps) => {
  const config = node.data.config || {};

  const handleChange = (field: string, value: any) => {
    onChange({
      config: {
        ...config,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="trigger-type">Trigger Type</Label>
        <Select
          value={config.triggerType || "schedule"}
          onValueChange={(val) => handleChange("triggerType", val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select trigger type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="schedule">Schedule (Cron)</SelectItem>
            <SelectItem value="webhook">Webhook</SelectItem>
            <SelectItem value="event">Event Subscription</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.triggerType === "schedule" && (
        <div className="space-y-2">
          <Label>Schedule</Label>
          <CronPicker
            value={config.cron || "* * * * *"}
            onChange={(val) => handleChange("cron", val)}
          />
        </div>
      )}

      {config.triggerType === "webhook" && (
        <div className="space-y-2">
           <div className="text-sm text-muted-foreground bg-blue-50 p-2 rounded border border-blue-100">
             Webhook URL will be generated after saving the workflow.
           </div>
        </div>
      )}

       {config.triggerType === "event" && (
        <div className="space-y-2">
           <Label>Event Type</Label>
           <Input
             value={config.eventType || ""}
             onChange={(e) => handleChange("eventType", e.target.value)}
             placeholder="e.g. user.created"
           />
        </div>
      )}
    </div>
  );
};

export default TriggerConfigForm;
