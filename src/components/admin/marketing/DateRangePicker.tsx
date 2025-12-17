"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "lucide-react";

export type DateRangePreset = "7d" | "30d" | "90d" | "custom";

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface DateRangePickerProps {
  preset: DateRangePreset;
  onPresetChange: (preset: DateRangePreset) => void;
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange) => void;
  className?: string;
}

const PRESETS: { value: DateRangePreset; label: string; }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "custom", label: "Custom range" },
];

export function getDateRangeFromPreset(preset: DateRangePreset): DateRange {
  const endDate = new Date();
  const startDate = new Date();

  switch (preset) {
    case "7d":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(startDate.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(startDate.getDate() - 90);
      break;
    case "custom":
      // Return last 30 days as default for custom
      startDate.setDate(startDate.getDate() - 30);
      break;
  }

  return { startDate, endDate };
}

export function formatDateForAPI(date: Date): string {
  const isoString = date.toISOString().split("T")[0];
  return isoString ?? "";
}

export function DateRangePicker({
  preset,
  onPresetChange,
  dateRange,
  onDateRangeChange,
  className,
}: DateRangePickerProps) {
  const handlePresetChange = (value: string) => {
    const newPreset = value as DateRangePreset;
    onPresetChange(newPreset);

    if (newPreset !== "custom" && onDateRangeChange) {
      onDateRangeChange(getDateRangeFromPreset(newPreset));
    }
  };

  const currentRange = dateRange || getDateRangeFromPreset(preset);

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <Select value={preset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={formatDateForAPI(currentRange.startDate)}
              onChange={(e) => {
                if (onDateRangeChange) {
                  onDateRangeChange({
                    startDate: new Date(e.target.value),
                    endDate: currentRange.endDate,
                  });
                }
              }}
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <input
              type="date"
              value={formatDateForAPI(currentRange.endDate)}
              onChange={(e) => {
                if (onDateRangeChange) {
                  onDateRangeChange({
                    startDate: currentRange.startDate,
                    endDate: new Date(e.target.value),
                  });
                }
              }}
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (onDateRangeChange) {
                  onDateRangeChange(getDateRangeFromPreset("30d"));
                }
              }}
            >
              Reset
            </Button>
          </div>
        )}
      </div>

      {preset !== "custom" && (
        <p className="mt-1 text-xs text-muted-foreground">
          {currentRange.startDate.toLocaleDateString()} -{" "}
          {currentRange.endDate.toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
