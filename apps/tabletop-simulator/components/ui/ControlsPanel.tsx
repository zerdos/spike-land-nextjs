"use client";
import type { InteractionMode } from "../../stores/useUIStore";

interface ControlsPanelProps {
  mode: InteractionMode;
  onToggleMode: () => void;
  onDiceRoll: (type: string) => void;
  onToggleHand: () => void;
  onToggleVideo?: () => void;
  videoEnabled?: boolean;
  handOpen?: boolean;
}

export function ControlsPanel({
  mode,
  onToggleMode,
  onDiceRoll,
  onToggleHand,
  onToggleVideo,
  videoEnabled,
  handOpen,
}: ControlsPanelProps) {
  const isInteractionMode = mode === "interaction";

  return (
    <>
      {/* Interaction mode screen border indicator */}
      {isInteractionMode && (
        <div
          className="fixed inset-0 pointer-events-none z-30 border-4 border-cyan-500/30 rounded-lg"
          style={{ animation: "pulse 2s ease-in-out infinite" }}
        />
      )}

      <div
        className="fixed bottom-6 left-6 flex flex-col gap-3 z-40 pointer-events-auto"
        data-testid="controls-panel"
      >
        {/* Mode Toggle - Primary action, larger and more prominent */}
        <button
          onClick={onToggleMode}
          data-testid="mode-toggle"
          className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 active:scale-90 ${
            isInteractionMode
              ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white ring-4 ring-cyan-400/50 shadow-cyan-500/30"
              : "bg-gradient-to-br from-gray-700 to-gray-800 text-gray-200 hover:from-gray-600 hover:to-gray-700"
          }`}
          title={isInteractionMode
            ? "Switch to Camera Mode (Move View)"
            : "Switch to Interact Mode (Grab Objects)"}
        >
          <span className="text-3xl">{isInteractionMode ? "✋" : "📷"}</span>
        </button>

        {/* Hand drawer toggle */}
        <button
          onClick={onToggleHand}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-90 ${
            handOpen
              ? "bg-gradient-to-br from-purple-500 to-purple-700 text-white ring-2 ring-purple-400/50"
              : "bg-gray-800/90 text-gray-200 hover:bg-gray-700 backdrop-blur-sm"
          }`}
          title="Toggle Your Hand"
        >
          <span className="text-2xl">🃏</span>
        </button>

        {/* Dice roll */}
        <button
          onClick={() => onDiceRoll("d6")}
          className="w-14 h-14 bg-gradient-to-br from-red-600 to-red-800 rounded-full text-white font-bold shadow-lg hover:from-red-500 hover:to-red-700 active:scale-90 transition-all duration-200 flex items-center justify-center"
          title="Roll a D6"
        >
          <span className="text-2xl">🎲</span>
        </button>

        {/* Video toggle */}
        {onToggleVideo && (
          <button
            onClick={onToggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-90 ${
              videoEnabled
                ? "bg-gradient-to-br from-green-500 to-green-700 text-white ring-2 ring-green-400/50"
                : "bg-gray-800/90 text-gray-300 hover:bg-gray-700 backdrop-blur-sm"
            }`}
            title={videoEnabled ? "Turn off camera" : "Turn on camera"}
          >
            <span className="text-2xl">{videoEnabled ? "📹" : "🎥"}</span>
          </button>
        )}
      </div>
    </>
  );
}
