import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CronPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const PRESETS = {
  EVERY_MINUTE: "* * * * *",
  HOURLY: "0 * * * *",
  DAILY: "0 9 * * *",
  WEEKLY: "0 9 * * 1",
};

const CronPicker = ({ value, onChange }: CronPickerProps) => {
  const [mode, setMode] = React.useState<"preset" | "custom">("preset");

  // Determine if current value matches a preset
  const currentPreset = Object.entries(PRESETS).find(([_, val]) => val === value)?.[0] || "custom";

  React.useEffect(() => {
    if (currentPreset === "custom" && mode === "preset" && value && !Object.values(PRESETS).includes(value)) {
        setMode("custom");
    }
  }, [value, currentPreset, mode]);

  const handlePresetChange = (newPreset: string) => {
    if (newPreset === "custom") {
      setMode("custom");
    } else {
      setMode("preset");
      onChange(PRESETS[newPreset as keyof typeof PRESETS]);
    }
  };

  return (
    <div className="space-y-3 border p-3 rounded-md bg-gray-50/50">
      <div className="space-y-1">
        <Label className="text-xs">Frequency</Label>
        <Select
          value={mode === "custom" ? "custom" : currentPreset}
          onValueChange={handlePresetChange}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EVERY_MINUTE">Every Minute</SelectItem>
            <SelectItem value="HOURLY">Hourly (at minute 0)</SelectItem>
            <SelectItem value="DAILY">Daily (at 9:00 AM)</SelectItem>
            <SelectItem value="WEEKLY">Weekly (Monday at 9:00 AM)</SelectItem>
            <SelectItem value="custom">Custom Expression</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mode === "custom" && (
        <div className="space-y-1">
          <Label className="text-xs">Cron Expression</Label>
          <Input
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="* * * * *"
            className="font-mono text-sm"
          />
          <p className="text-[10px] text-muted-foreground">
            Format: minute hour day(month) month day(week)
          </p>
        </div>
      )}
    </div>
  );
};

export default CronPicker;
