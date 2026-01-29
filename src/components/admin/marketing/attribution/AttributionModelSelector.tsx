"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type AttributionModel =
  | "FIRST_TOUCH"
  | "LAST_TOUCH"
  | "LINEAR"
  | "TIME_DECAY"
  | "POSITION_BASED";

interface AttributionModelSelectorProps {
  selectedModel: AttributionModel;
  onModelChange: (model: AttributionModel) => void;
  className?: string;
}

const MODEL_LABELS: Record<AttributionModel, string> = {
  FIRST_TOUCH: "First Touch",
  LAST_TOUCH: "Last Touch",
  LINEAR: "Linear",
  TIME_DECAY: "Time Decay",
  POSITION_BASED: "Position-Based",
};

const MODEL_DESCRIPTIONS: Record<AttributionModel, string> = {
  FIRST_TOUCH: "100% credit to first interaction",
  LAST_TOUCH: "100% credit to last interaction",
  LINEAR: "Equal credit across all touchpoints",
  TIME_DECAY: "More credit to recent interactions",
  POSITION_BASED: "40% first, 40% last, 20% middle",
};

export function AttributionModelSelector({
  selectedModel,
  onModelChange,
  className,
}: AttributionModelSelectorProps) {
  return (
    <Select value={selectedModel} onValueChange={onModelChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select model" />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(MODEL_LABELS) as AttributionModel[]).map((model) => (
          <SelectItem key={model} value={model}>
            <div className="flex flex-col">
              <span className="font-medium">{MODEL_LABELS[model]}</span>
              <span className="text-xs text-muted-foreground">
                {MODEL_DESCRIPTIONS[model]}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
