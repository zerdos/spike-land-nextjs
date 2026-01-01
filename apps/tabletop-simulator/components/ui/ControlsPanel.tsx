"use client";
import { TouchMode } from "../../hooks/useTouchControls";

interface ControlsPanelProps {
  mode: TouchMode;
  onToggleMode: () => void;
  onDiceRoll: (type: string) => void;
  onToggleHand: () => void;
}

export function ControlsPanel(
  { mode, onToggleMode, onDiceRoll, onToggleHand }: ControlsPanelProps,
) {
  return (
    <div
      className="fixed bottom-6 left-6 flex flex-col gap-4 z-40 pointer-events-auto"
      data-testid="controls-panel"
    >
      <button
        onClick={onToggleMode}
        data-testid="mode-toggle"
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${
          mode === "interaction"
            ? "bg-blue-600 text-white ring-2 ring-blue-300"
            : "bg-gray-800 text-gray-300"
        }`}
        title={mode === "interaction" ? "Switch to Camera Mode" : "Switch to Interact Mode"}
      >
        <span className="text-2xl">{mode === "interaction" ? "✋" : "📷"}</span>
      </button>

      <button
        onClick={onToggleHand}
        className="w-14 h-14 bg-gray-800 rounded-full flex items-center justify-center shadow-lg text-white hover:bg-gray-700 active:scale-95"
        title="Toggle Hand"
      >
        <span className="text-2xl">🃏</span>
      </button>

      <button
        onClick={() => onDiceRoll("d6")}
        className="w-14 h-14 bg-red-700 rounded-full text-white font-bold shadow-lg hover:bg-red-600 active:scale-95 flex items-center justify-center"
      >
        🎲
      </button>
    </div>
  );
}
