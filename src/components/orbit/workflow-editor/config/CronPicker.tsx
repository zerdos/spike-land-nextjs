import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import React from "react";

interface CronPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const PRESETS = [
  { label: "Every Minute", value: "* * * * *" },
  { label: "Every Hour", value: "0 * * * *" },
  { label: "Every Day at 9am", value: "0 9 * * *" },
  { label: "Every Monday at 9am", value: "0 9 * * 1" },
  { label: "First of Month at 9am", value: "0 9 1 * *" },
];

const CronPicker = ({ value, onChange }: CronPickerProps) => {
  const isPreset = PRESETS.some((p) => p.value === value);
  const [mode, setMode] = React.useState<"preset" | "custom">(
    isPreset ? "preset" : "custom",
  );

  const handlePresetChange = (newValue: string) => {
    if (newValue === "custom") {
      setMode("custom");
    } else {
      setMode("preset");
      onChange(newValue);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Schedule</Label>
      <Select
        value={mode === "preset" ? value : "custom"}
        onValueChange={handlePresetChange}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select schedule" />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
          <SelectItem value="custom">Custom Expression</SelectItem>
        </SelectContent>
      </Select>

      {mode === "custom" && (
        <div className="pt-2">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="* * * * *"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Standard cron expression (min hour day month weekday)
          </p>
        </div>
      )}
    </div>
  );
};

export default CronPicker;
