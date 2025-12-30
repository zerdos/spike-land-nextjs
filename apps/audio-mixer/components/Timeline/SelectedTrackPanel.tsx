/**
 * SelectedTrackPanel Component - Controls panel for the currently selected track
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
    <div className="px-8 py-6 bg-white/[0.03] backdrop-blur-xl border-t border-white/10 shadow-2xl relative overflow-hidden">
      {/* Background glow for the selected track */}
      <div className="absolute top-0 left-0 w-64 h-full bg-primary/5 blur-[40px] -z-10" />

      <div className="flex items-center gap-8 relative z-10">
        {/* Track name & Metadata */}
        <div className="flex-shrink-0 min-w-[160px] space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-glow-cyan-sm" />
            <div className="text-sm font-bold text-white tracking-tight truncate max-w-[140px]">
              {track.name}
            </div>
          </div>
          <div className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
            <span className="text-primary/60">
              {formatTime(trimmedDuration)}
            </span>
            <span className="opacity-20">/</span>
            <span>{formatTime(track.duration)}</span>
          </div>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-4 bg-white/5 px-4 py-2.5 rounded-2xl border border-white/5">
          <Volume2 className="w-4 h-4 text-primary/80" />
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(track.volume * 100)}
            onChange={(e) => onVolumeChange(parseInt(e.target.value) / 100)}
            className="w-32 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
            aria-label="Track volume"
          />
          <span className="text-[10px] font-mono font-bold text-white/60 w-8">
            {Math.round(track.volume * 100)}%
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Mute button */}
          <button
            onClick={onMuteToggle}
            className={cn(
              "p-2.5 rounded-xl transition-all active:scale-95 border",
              track.muted
                ? "bg-red-500/20 text-red-500 border-red-500/30 shadow-glow-red-sm"
                : "bg-white/5 text-gray-400 border-white/10 hover:text-white",
            )}
            title={track.muted ? "Unmute" : "Mute"}
          >
            <VolumeX className="w-4 h-4" />
          </button>

          {/* Solo button */}
          <button
            onClick={onSoloToggle}
            className={cn(
              "p-2.5 rounded-xl transition-all active:scale-95 border",
              track.solo
                ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/30 shadow-glow-yellow-sm"
                : "bg-white/5 text-gray-400 border-white/10 hover:text-white",
            )}
            title={track.solo ? "Unsolo" : "Solo"}
          >
            <Headphones className="w-4 h-4" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-10 bg-white/10" />

        {/* Trim controls */}
        <div className="flex items-center gap-4 bg-white/5 px-5 py-2.5 rounded-2xl border border-white/5">
          <Scissors className="w-4 h-4 text-primary/60" />
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] font-bold text-white/30 uppercase tracking-tighter">
                Start Offset
              </span>
              <input
                type="number"
                min="-30"
                max={effectiveTrimEnd - 0.1}
                step="0.1"
                value={track.trimStart.toFixed(1)}
                onChange={(e) =>
                  onTrimChange(
                    parseFloat(e.target.value) || 0,
                    effectiveTrimEnd,
                  )}
                className="w-16 h-7 text-xs bg-black/40 text-primary font-mono font-bold rounded-lg border border-white/5 focus:outline-none focus:border-primary/50 text-center"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] font-bold text-white/30 uppercase tracking-tighter">
                End Point
              </span>
              <input
                type="number"
                min={Math.max(0.1, track.trimStart + 0.1)}
                max={track.duration}
                step="0.1"
                value={effectiveTrimEnd.toFixed(1)}
                onChange={(e) =>
                  onTrimChange(
                    track.trimStart,
                    parseFloat(e.target.value) || track.duration,
                  )}
                className="w-16 h-7 text-xs bg-black/40 text-primary font-mono font-bold rounded-lg border border-white/5 focus:outline-none focus:border-primary/50 text-center"
              />
            </div>
          </div>
          {track.trimStart < 0 && (
            <Badge
              variant="outline"
              className="text-[9px] bg-primary/10 text-primary border-primary/20 font-mono"
            >
              +{Math.abs(track.trimStart).toFixed(1)}s Lead
            </Badge>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Remove button */}
        <button
          onClick={onRemove}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-500/5 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded-2xl border border-red-500/10 hover:border-red-500/30 transition-all font-bold text-xs active:scale-95"
          title="Remove track"
        >
          <Trash2 className="w-4 h-4" />
          Delete Track
        </button>
      </div>
    </div>
  );
}
