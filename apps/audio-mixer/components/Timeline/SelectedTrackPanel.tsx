/**
 * SelectedTrackPanel Component - Controls panel for the currently selected track
 */

"use client";

import { Headphones, Scissors, Trash2, Volume2, VolumeX } from "lucide-react";
import type { AudioTrack } from "../../types";

interface SelectedTrackPanelProps {
  track: AudioTrack | null;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  onTrimChange: (trimStart: number, trimEnd: number) => void;
  onRemove: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return `${mins}:${secs.padStart(4, "0")}`;
}

export function SelectedTrackPanel({
  track,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
  onTrimChange,
  onRemove,
}: SelectedTrackPanelProps) {
  if (!track) {
    return (
      <div className="px-4 py-3 bg-gray-800 border-t border-gray-700 text-gray-500 text-sm text-center">
        Select a track to edit its properties
      </div>
    );
  }

  const effectiveTrimEnd = track.trimEnd > 0 ? track.trimEnd : track.duration;
  const trimmedDuration = effectiveTrimEnd - track.trimStart;

  return (
    <div className="px-4 py-3 bg-gray-800 border-t border-gray-700">
      <div className="flex items-center gap-6">
        {/* Track name */}
        <div className="flex-shrink-0 min-w-0">
          <div className="text-sm font-medium text-white truncate max-w-32">
            {track.name}
          </div>
          <div className="text-xs text-gray-500">
            {formatTime(trimmedDuration)} / {formatTime(track.duration)}
          </div>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-gray-400" />
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(track.volume * 100)}
            onChange={(e) => onVolumeChange(parseInt(e.target.value) / 100)}
            className="w-24 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            aria-label="Track volume"
          />
          <span className="text-xs text-gray-400 w-8">
            {Math.round(track.volume * 100)}%
          </span>
        </div>

        {/* Mute button */}
        <button
          onClick={onMuteToggle}
          className={`p-1.5 rounded transition-colors ${
            track.muted
              ? "bg-red-600 text-white"
              : "bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600"
          }`}
          title={track.muted ? "Unmute" : "Mute"}
        >
          <VolumeX className="w-4 h-4" />
        </button>

        {/* Solo button */}
        <button
          onClick={onSoloToggle}
          className={`p-1.5 rounded transition-colors ${
            track.solo
              ? "bg-yellow-500 text-black"
              : "bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600"
          }`}
          title={track.solo ? "Unsolo" : "Solo"}
        >
          <Headphones className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-700" />

        {/* Trim controls */}
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-gray-400" />
          <div className="flex items-center gap-1">
            <label className="text-xs text-gray-500">Start:</label>
            <input
              type="number"
              min="0"
              max={effectiveTrimEnd - 0.1}
              step="0.1"
              value={track.trimStart.toFixed(1)}
              onChange={(e) => onTrimChange(parseFloat(e.target.value) || 0, effectiveTrimEnd)}
              className="w-16 px-1.5 py-0.5 text-xs bg-gray-700 text-gray-300 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs text-gray-500">End:</label>
            <input
              type="number"
              min={track.trimStart + 0.1}
              max={track.duration}
              step="0.1"
              value={effectiveTrimEnd.toFixed(1)}
              onChange={(e) =>
                onTrimChange(track.trimStart, parseFloat(e.target.value) || track.duration)}
              className="w-16 px-1.5 py-0.5 text-xs bg-gray-700 text-gray-300 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Remove button */}
        <button
          onClick={onRemove}
          className="flex items-center gap-1.5 px-2 py-1 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
          title="Remove track"
        >
          <Trash2 className="w-4 h-4" />
          Remove
        </button>
      </div>
    </div>
  );
}
