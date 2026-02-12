"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { Brain, Eye, Pencil, Wrench, X } from "lucide-react";
import { VibeCodeInput } from "./vibe-code-input";
import { VibeCodeMessages } from "./vibe-code-messages";
import { useVibeCode } from "./vibe-code-provider";

function PanelHeader({
  mode,
  setMode,
  isStreaming,
  closePanel,
}: {
  mode: "plan" | "edit";
  setMode: (mode: "plan" | "edit") => void;
  isStreaming: boolean;
  closePanel: () => void;
}) {
  const isPlan = mode === "plan";

  return (
    <div className="flex items-center justify-between p-3 border-b">
      <h2 className="font-semibold text-sm">Vibe Code</h2>
      <div className="flex items-center gap-2">
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(val) => {
            if (val) setMode(val as "plan" | "edit");
          }}
          disabled={isStreaming}
          className={`h-8 ${isStreaming ? "opacity-50 pointer-events-none" : ""}`}
        >
          <ToggleGroupItem
            value="plan"
            className={`h-7 px-2.5 text-xs gap-1 ${
              isPlan
                ? "bg-blue-600 text-white shadow-sm data-[state=on]:bg-blue-600 data-[state=on]:text-white"
                : ""
            }`}
            aria-label="Plan mode"
          >
            <Brain className="w-3.5 h-3.5" />
            Plan
          </ToggleGroupItem>
          <ToggleGroupItem
            value="edit"
            className={`h-7 px-2.5 text-xs gap-1 ${
              !isPlan
                ? "bg-amber-600 text-white shadow-sm data-[state=on]:bg-amber-600 data-[state=on]:text-white"
                : ""
            }`}
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
  );
}

function ModeBanner({ mode }: { mode: "plan" | "edit" }) {
  const isPlan = mode === "plan";

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium ${
        isPlan
          ? "bg-blue-600/15 text-blue-400 border-b border-blue-600/20"
          : "bg-amber-600/15 text-amber-400 border-b border-amber-600/20"
      }`}
      role="status"
      aria-live="polite"
    >
      {isPlan ? (
        <>
          <Eye className="w-3.5 h-3.5" />
          <span>Read-only — analyzing code, no changes</span>
        </>
      ) : (
        <>
          <Pencil className="w-3.5 h-3.5" />
          <span>Edit mode — AI can modify your code</span>
        </>
      )}
    </div>
  );
}

export function VibeCodePanel() {
  const { isOpen, closePanel, mode, setMode, isStreaming } = useVibeCode();

  return (
    <>
      {/* Desktop sidebar */}
      <div className="w-96 border-l bg-card h-[calc(100vh-4rem)] hidden lg:flex flex-col">
        <PanelHeader
          mode={mode}
          setMode={setMode}
          isStreaming={isStreaming}
          closePanel={closePanel}
        />
        <ModeBanner mode={mode} />
        <VibeCodeMessages />
        <VibeCodeInput />
      </div>

      {/* Mobile bottom sheet */}
      <Sheet open={isOpen} onOpenChange={(open) => { if (!open) closePanel(); }}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] flex flex-col p-0 lg:hidden"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Accessible sheet header (visually hidden title for screen readers) */}
          <SheetHeader className="sr-only">
            <SheetTitle>Vibe Code</SheetTitle>
            <SheetDescription>AI coding assistant panel</SheetDescription>
          </SheetHeader>

          <PanelHeader
            mode={mode}
            setMode={setMode}
            isStreaming={isStreaming}
            closePanel={closePanel}
          />
          <ModeBanner mode={mode} />
          <VibeCodeMessages />
          <VibeCodeInput />
        </SheetContent>
      </Sheet>
    </>
  );
}
