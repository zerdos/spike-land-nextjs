"use client";

import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { Brain, Wrench, X } from "lucide-react";
import { VibeCodeInput } from "./vibe-code-input";
import { VibeCodeMessages } from "./vibe-code-messages";
import { useVibeCode } from "./vibe-code-provider";

export function VibeCodePanel() {
  const { closePanel, mode, setMode } = useVibeCode();

  return (
    <div className="w-96 border-l bg-card h-[calc(100vh-4rem)] hidden lg:flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h2 className="font-semibold text-sm">Vibe Code</h2>
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(val) => {
              if (val) setMode(val as "plan" | "edit");
            }}
            className="h-8"
          >
            <ToggleGroupItem
              value="plan"
              className="h-7 px-2 text-xs gap-1"
              aria-label="Plan mode"
            >
              <Brain className="w-3.5 h-3.5" />
              Plan
            </ToggleGroupItem>
            <ToggleGroupItem
              value="edit"
              className="h-7 px-2 text-xs gap-1"
              aria-label="Edit mode"
            >
              <Wrench className="w-3.5 h-3.5" />
              Edit
            </ToggleGroupItem>
          </ToggleGroup>
          <button
            type="button"
            onClick={closePanel}
            className="p-1 rounded-md hover:bg-muted transition-colors"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <VibeCodeMessages />

      {/* Input */}
      <VibeCodeInput />
    </div>
  );
}
