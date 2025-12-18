/**
 * RecordingPanel Component - Audio recording controls
 * Resolves #332
 */

"use client";

import { Circle, Pause, Square } from "lucide-react";
import { formatTime } from "../lib/audio-engine";

interface RecordingPanelProps {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onCancel: () => void;
}

export function RecordingPanel({
  isRecording,
  isPaused,
  duration,
  onStart,
  onPause,
  onResume,
  onStop,
  onCancel,
}: RecordingPanelProps) {
  if (!isRecording) {
    return (
      <button
        onClick={onStart}
        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
      >
        <Circle className="w-4 h-4 fill-current" />
        Record
      </button>
    );
  }

  return (
    <div className="flex items-center gap-4 bg-gray-800 rounded-lg p-4">
      {/* Recording indicator */}
      <div className="flex items-center gap-2">
        <div
          className={`w-3 h-3 rounded-full ${
            isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"
          }`}
        />
        <span className="text-white font-mono">{formatTime(duration)}</span>
      </div>

      {/* Pause/Resume */}
      <button
        onClick={isPaused ? onResume : onPause}
        className="p-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors"
        aria-label={isPaused ? "Resume recording" : "Pause recording"}
      >
        {isPaused ? <Circle className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
      </button>

      {/* Stop (save) */}
      <button
        onClick={onStop}
        className="p-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
        aria-label="Stop and save recording"
      >
        <Square className="w-4 h-4 fill-current" />
      </button>

      {/* Cancel */}
      <button
        onClick={onCancel}
        className="px-3 py-1 text-gray-400 hover:text-white transition-colors"
        aria-label="Cancel recording"
      >
        Cancel
      </button>
    </div>
  );
}
