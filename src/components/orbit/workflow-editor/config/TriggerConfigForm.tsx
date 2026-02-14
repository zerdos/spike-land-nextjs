import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { WorkflowNodeData } from "../types";
import CronPicker from "./CronPicker";

interface TriggerConfigFormProps {
  data: WorkflowNodeData;
  onChange: (data: Partial<WorkflowNodeData>) => void;
}

const TriggerConfigForm = ({ data, onChange }: TriggerConfigFormProps) => {
  const config = (data["config"] || {}) as Record<string, string>;

  const handleTypeChange = (value: string) => {
    onChange({ ...data, config: { ...config, type: value } });
  };

  const handleCronChange = (cron: string) => {
    onChange({
      ...data,
      config: { ...config, cron },
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Trigger Type</Label>
        <Select
          value={config["type"] || "schedule"}
          onValueChange={handleTypeChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select trigger type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="schedule">Schedule (Cron)</SelectItem>
            <SelectItem value="webhook">Webhook</SelectItem>
            <SelectItem value="event">Event</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config["type"] === "schedule" && (
        <CronPicker value={config["cron"] || ""} onChange={handleCronChange} />
      )}

      {config["type"] === "webhook" && (
        <div className="rounded-md bg-muted p-3 text-sm">
          <p className="font-medium">Webhook URL</p>
          <code className="block mt-1 break-all text-xs">
            https://api.example.com/hooks/workflow/{String(data["id"] ?? "")}
          </code>
        </div>
      )}
    </div>
  );
};

export default TriggerConfigForm;
