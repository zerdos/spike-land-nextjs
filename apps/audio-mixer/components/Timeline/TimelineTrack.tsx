/**
 * TimelineTrack Component - Individual track block on the timeline
 * Draggable, shows waveform, click to select
 * Supports edge trimming by dragging left/right handles
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AudioTrack } from "../../types";

interface TimelineTrackProps {
  track: AudioTrack;
  zoom: number;
  isSelected: boolean;
  playheadTime: number;
  snapTime: (time: number) => number;
  onPositionChange: (position: number) => void;
  onTrimChange?: (trimStart: number, trimEnd: number) => void;
  onSelect: () => void;
}

const TRACK_HEIGHT = 64;
const TRACK_COLORS = [
  "bg-blue-600",
  "bg-green-600",
  "bg-purple-600",
  "bg-orange-600",
  "bg-pink-600",
  "bg-cyan-600",
  "bg-yellow-600",
  "bg-red-600",
];

function drawWaveform(
  canvas: HTMLCanvasElement,
  waveformData: number[],
  progress: number,
  trackColor: string,
  trimStart: number,
  trimEnd: number,
  duration: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  if (waveformData.length === 0) return;

  // Calculate which portion of the waveform to show
  const startRatio = Math.max(0, trimStart) / duration;
  const endRatio = (trimEnd > 0 ? trimEnd : duration) / duration;
  const visibleDataLength = Math.floor(waveformData.length * (endRatio - startRatio));
  const dataOffset = Math.floor(waveformData.length * startRatio);

  const barCount = Math.min(visibleDataLength, Math.floor(width / 3));
  if (barCount === 0) return;

  const step = visibleDataLength / barCount;
  const barWidth = Math.max(1, (width / barCount) - 1);
  const progressIndex = Math.floor(progress * barCount);

  // Get RGB values from track color class
  const colorMap: Record<string, string> = {
    "bg-blue-600": "59, 130, 246",
    "bg-green-600": "22, 163, 74",
    "bg-purple-600": "147, 51, 234",
    "bg-orange-600": "234, 88, 12",
    "bg-pink-600": "219, 39, 119",
    "bg-cyan-600": "8, 145, 178",
    "bg-yellow-600": "202, 138, 4",
    "bg-red-600": "220, 38, 38",
  };
  const rgb = colorMap[trackColor] || "59, 130, 246";

  for (let i = 0; i < barCount; i++) {
    const dataIndex = dataOffset + Math.floor(i * step);
    const value = waveformData[dataIndex] || 0;
    const barHeight = Math.max(2, value * height * 0.8);
    const x = i * (barWidth + 1);
    const y = (height - barHeight) / 2;

    // Played portion is brighter
    ctx.fillStyle = i < progressIndex
      ? `rgba(${rgb}, 1)`
      : `rgba(${rgb}, 0.5)`;

    ctx.fillRect(x, y, barWidth, barHeight);
  }
}

type DragMode = "move" | "trim-start" | "trim-end" | null;

export function TimelineTrack({
  track,
  zoom,
  isSelected,
  playheadTime,
  snapTime,
  onPositionChange,
  onTrimChange,
  onSelect,
}: TimelineTrackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [isHoveringHandle, setIsHoveringHandle] = useState<"start" | "end" | null>(null);

  const startX = useRef(0);
  const startPosition = useRef(0);
  const startTrimStart = useRef(0);
  const startTrimEnd = useRef(0);

  // Calculate dimensions
  // Support negative trimStart (adds silence before track)
  const effectiveTrimStart = track.trimStart;
  const effectiveTrimEnd = track.trimEnd > 0 ? track.trimEnd : track.duration;

  // If trimStart is negative, we're adding silence at the beginning
  const silenceBefore = effectiveTrimStart < 0 ? Math.abs(effectiveTrimStart) : 0;
  const actualAudioStart = Math.max(0, effectiveTrimStart);
  const actualAudioDuration = effectiveTrimEnd - actualAudioStart;

  const totalVisualDuration = silenceBefore + actualAudioDuration;
  const trackWidth = totalVisualDuration * zoom;
  const trackLeft = (track.position ?? track.delay ?? 0) * zoom;

  // Calculate playback progress within this track
  const trackPosition = track.position ?? track.delay ?? 0;
  const relativeTime = playheadTime - trackPosition - silenceBefore;
  const progress = Math.max(0, Math.min(1, relativeTime / actualAudioDuration));

  // Get track color based on index (use id hash for consistency)
  const colorIndex = Math.abs(track.id.split("").reduce((a, b) => a + b.charCodeAt(0), 0)) %
    TRACK_COLORS.length;
  const trackColor = TRACK_COLORS[colorIndex] ?? "bg-blue-600";

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size (only for audio portion, not silence)
    const audioWidth = actualAudioDuration * zoom;
    canvas.width = Math.max(1, Math.floor(audioWidth));
    canvas.height = TRACK_HEIGHT - 16; // Account for padding

    drawWaveform(
      canvas,
      track.waveformData,
      track.isPlaying ? progress : 0,
      trackColor,
      actualAudioStart,
      effectiveTrimEnd,
      track.duration,
    );
  }, [
    track.waveformData,
    actualAudioDuration,
    zoom,
    progress,
    track.isPlaying,
    trackColor,
    actualAudioStart,
    effectiveTrimEnd,
    track.duration,
  ]);

  // Handle drag start
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, mode: DragMode) => {
      if (e.button !== 0) return;

      e.preventDefault();
      e.stopPropagation();
      onSelect();

      setDragMode(mode);
      startX.current = e.clientX;
      startPosition.current = track.position ?? track.delay ?? 0;
      startTrimStart.current = track.trimStart;
      startTrimEnd.current = track.trimEnd > 0 ? track.trimEnd : track.duration;
    },
    [track.position, track.delay, track.trimStart, track.trimEnd, track.duration, onSelect],
  );

  // Handle drag move and end
  useEffect(() => {
    if (!dragMode) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX.current;
      const deltaTime = deltaX / zoom;

      if (dragMode === "move") {
        const newPosition = Math.max(0, startPosition.current + deltaTime);
        const snappedPosition = snapTime(newPosition);
        onPositionChange(snappedPosition);
      } else if (dragMode === "trim-start" && onTrimChange) {
        // Trimming the start: can go negative (adds silence)
        // Moving right: increase trimStart (trim more audio)
        // Moving left: decrease trimStart (can go negative for silence)
        const newTrimStart = startTrimStart.current + deltaTime;
        // Don't let trimStart exceed trimEnd - 0.1s (minimum duration)
        const maxTrimStart = startTrimEnd.current - 0.1;
        // Allow negative values (adding silence)
        const clampedTrimStart = Math.min(newTrimStart, maxTrimStart);
        const snappedTrimStart = snapTime(clampedTrimStart);
        onTrimChange(snappedTrimStart, startTrimEnd.current);
      } else if (dragMode === "trim-end" && onTrimChange) {
        // Trimming the end
        // Moving right: increase trimEnd (extend beyond original = silence at end not really useful, cap at duration)
        // Moving left: decrease trimEnd (trim audio from end)
        const newTrimEnd = startTrimEnd.current + deltaTime;
        // Minimum: trimStart + 0.1s
        const minTrimEnd = Math.max(0, startTrimStart.current) + 0.1;
        // Maximum: track duration (can't extend beyond original audio)
        const maxTrimEnd = track.duration;
        const clampedTrimEnd = Math.max(minTrimEnd, Math.min(maxTrimEnd, newTrimEnd));
        const snappedTrimEnd = snapTime(clampedTrimEnd);
        onTrimChange(startTrimStart.current, snappedTrimEnd);
      }
    };

    const handleMouseUp = () => {
      setDragMode(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragMode, zoom, snapTime, onPositionChange, onTrimChange, track.duration]);

  // Calculate silence region width
  const silenceWidth = silenceBefore * zoom;

  return (
    <div
      className={`absolute rounded-md transition-shadow ${
        isSelected ? "ring-2 ring-white shadow-lg" : "hover:ring-1 hover:ring-white/50"
      } ${track.muted ? "opacity-50" : ""}`}
      style={{
        left: `${trackLeft}px`,
        width: `${Math.max(trackWidth, 20)}px`,
        height: `${TRACK_HEIGHT}px`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Left trim handle */}
      {onTrimChange && (
        <div
          className={`absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-20 group ${
            dragMode === "trim-start" ? "bg-white/40" : ""
          }`}
          onMouseDown={(e) => handleMouseDown(e, "trim-start")}
          onMouseEnter={() => setIsHoveringHandle("start")}
          onMouseLeave={() => setIsHoveringHandle(null)}
        >
          {/* Handle visual */}
          <div
            className={`absolute inset-y-2 left-0 w-1.5 rounded-full transition-all ${
              isHoveringHandle === "start" || dragMode === "trim-start"
                ? "bg-white/80 shadow-lg"
                : "bg-white/30 group-hover:bg-white/60"
            }`}
          />
          {/* Trim indicator */}
          {(isHoveringHandle === "start" || dragMode === "trim-start") && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-gray-900 rounded text-[10px] text-white whitespace-nowrap border border-gray-600">
              {effectiveTrimStart < 0
                ? `+${(-effectiveTrimStart).toFixed(1)}s`
                : `${effectiveTrimStart.toFixed(1)}s`}
            </div>
          )}
        </div>
      )}

      {/* Right trim handle */}
      {onTrimChange && (
        <div
          className={`absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-20 group ${
            dragMode === "trim-end" ? "bg-white/40" : ""
          }`}
          onMouseDown={(e) => handleMouseDown(e, "trim-end")}
          onMouseEnter={() => setIsHoveringHandle("end")}
          onMouseLeave={() => setIsHoveringHandle(null)}
        >
          {/* Handle visual */}
          <div
            className={`absolute inset-y-2 right-0 w-1.5 rounded-full transition-all ${
              isHoveringHandle === "end" || dragMode === "trim-end"
                ? "bg-white/80 shadow-lg"
                : "bg-white/30 group-hover:bg-white/60"
            }`}
          />
          {/* Trim indicator */}
          {(isHoveringHandle === "end" || dragMode === "trim-end") && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-gray-900 rounded text-[10px] text-white whitespace-nowrap border border-gray-600">
              {effectiveTrimEnd.toFixed(1)}s
            </div>
          )}
        </div>
      )}

      {/* Silence region (if trimStart is negative) */}
      {silenceBefore > 0 && (
        <div
          className="absolute top-0 bottom-0 bg-gray-700/50 border-r border-dashed border-gray-500"
          style={{
            left: 0,
            width: `${silenceWidth}px`,
          }}
        >
          <div className="h-full flex items-center justify-center">
            <span className="text-[10px] text-gray-400 rotate-0">silence</span>
          </div>
        </div>
      )}

      {/* Main track content - draggable area */}
      <div
        className={`absolute top-0 bottom-0 ${trackColor} rounded-md cursor-move`}
        style={{
          left: `${silenceWidth}px`,
          right: 0,
        }}
        onMouseDown={(e) => handleMouseDown(e, "move")}
      >
        <div className="h-full p-2 flex flex-col">
          {/* Track name */}
          <div className="text-xs text-white/90 font-medium truncate mb-1">
            {track.name}
            {track.muted && <span className="ml-1 text-white/50">(muted)</span>}
            {track.solo && <span className="ml-1 text-yellow-300">(solo)</span>}
          </div>

          {/* Waveform canvas */}
          <canvas
            ref={canvasRef}
            className="flex-1 w-full rounded"
            style={{ imageRendering: "pixelated" }}
          />
        </div>
      </div>

      {/* Playing indicator */}
      {track.isPlaying && (
        <div className="absolute inset-0 rounded-md border-2 border-white/30 animate-pulse pointer-events-none" />
      )}
    </div>
  );
}

export { TRACK_HEIGHT };
