/**
 * TrackItem Component - Individual track controls
 * Resolves #332
 */

"use client";

import { Mic, Pause, Play, Trash2, Volume2, VolumeX } from "lucide-react";
import { formatTime } from "../lib/audio-engine";
import type { AudioTrack } from "../types";
import { Waveform } from "./Waveform";

interface TrackItemProps {
  track: AudioTrack;
  onPlay: () => void;
  onStop: () => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  onRemove: () => void;
  onSeek?: (progress: number) => void;
}

export function TrackItem({
  track,
  onPlay,
  onStop,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
  onRemove,
  onSeek,
}: TrackItemProps) {
  const progress = track.duration > 0 ? track.currentTime / track.duration : 0;

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-3">
      {/* Track Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {track.type === "recording" && <Mic className="w-4 h-4 text-red-400" />}
          <span className="text-white font-medium truncate max-w-[200px]">
            {track.name}
          </span>
          <span className="text-gray-400 text-sm">
            {formatTime(track.duration)}
          </span>
        </div>
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-red-400 transition-colors p-1"
          aria-label="Remove track"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Waveform */}
      <div className="bg-gray-900 rounded p-2">
        <Waveform
          data={track.waveformData}
          progress={progress}
          width={400}
          height={50}
          barColor={track.muted ? "#374151" : "#4b5563"}
          progressColor={track.muted ? "#6b7280" : "#3b82f6"}
          onClick={onSeek}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Play/Stop */}
        <button
          onClick={track.isPlaying ? onStop : onPlay}
          className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          aria-label={track.isPlaying ? "Stop" : "Play"}
        >
          {track.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        {/* Mute/Unmute */}
        <button
          onClick={onMuteToggle}
          className={`p-2 rounded transition-colors ${
            track.muted
              ? "bg-red-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
          aria-label={track.muted ? "Unmute" : "Mute"}
        >
          {track.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Solo */}
        <button
          onClick={onSoloToggle}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            track.solo
              ? "bg-yellow-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
          aria-label={track.solo ? "Disable solo" : "Enable solo"}
        >
          S
        </button>

        {/* Volume Slider */}
        <div className="flex items-center gap-2 flex-1">
          <Volume2 className="w-4 h-4 text-gray-400" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={track.volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            aria-label="Track volume"
          />
          <span className="text-gray-400 text-sm w-10 text-right">
            {Math.round(track.volume * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
