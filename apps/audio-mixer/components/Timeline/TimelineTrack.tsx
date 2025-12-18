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
    "bg-blue-600": "0, 229, 255", // Pixel Cyan
    "bg-green-600": "16, 185, 129",
    "bg-purple-600": "168, 85, 247",
    "bg-orange-600": "249, 115, 22",
    "bg-pink-600": "236, 72, 153",
    "bg-cyan-600": "6, 182, 212",
    "bg-yellow-600": "234, 179, 8",
    "bg-red-600": "239, 68, 68",
  };
  const rgb = colorMap[trackColor] || "0, 229, 255";

  for (let i = 0; i < barCount; i++) {
    const dataIndex = dataOffset + Math.floor(i * step);
    const value = waveformData[dataIndex] || 0;
    const barHeight = Math.max(2, value * height * 0.9);
    const x = i * (barWidth + 1);
    const y = (height - barHeight) / 2;

    const isPlayed = i < progressIndex;

    // Create gradient for each bar
    const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
    if (isPlayed) {
      gradient.addColorStop(0, `rgba(${rgb}, 1)`);
      gradient.addColorStop(1, `rgba(${rgb}, 0.6)`);
      ctx.shadowBlur = 10;
      ctx.shadowColor = `rgba(${rgb}, 0.5)`;
    } else {
      gradient.addColorStop(0, `rgba(${rgb}, 0.3)`);
      gradient.addColorStop(1, `rgba(${rgb}, 0.15)`);
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = gradient;

    // Rounded rectangles for bars
    const radius = barWidth / 2;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, radius);
    ctx.fill();
    ctx.shadowBlur = 0; // Reset for next bar
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
  const effectiveTrimStart = track.trimStart;
  const effectiveTrimEnd = track.trimEnd > 0 ? track.trimEnd : track.duration;

  const silenceBefore = effectiveTrimStart < 0 ? Math.abs(effectiveTrimStart) : 0;
  const actualAudioStart = Math.max(0, effectiveTrimStart);
  const actualAudioDuration = effectiveTrimEnd - actualAudioStart;

  const totalVisualDuration = silenceBefore + actualAudioDuration;
  const trackWidth = totalVisualDuration * zoom;
  const trackLeft = (track.position ?? track.delay ?? 0) * zoom;

  const trackPosition = track.position ?? track.delay ?? 0;
  const relativeTime = playheadTime - trackPosition - silenceBefore;
  const progress = Math.max(0, Math.min(1, relativeTime / actualAudioDuration));

  const colorIndex = Math.abs(track.id.split("").reduce((a, b) => a + b.charCodeAt(0), 0)) %
    TRACK_COLORS.length;
  const trackColor = TRACK_COLORS[colorIndex] ?? "bg-blue-600";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const audioWidth = actualAudioDuration * zoom;
    canvas.width = Math.max(1, Math.floor(audioWidth));
    canvas.height = TRACK_HEIGHT - 24;

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
        const newTrimStart = startTrimStart.current + deltaTime;
        const maxTrimStart = startTrimEnd.current - 0.1;
        const clampedTrimStart = Math.min(newTrimStart, maxTrimStart);
        const snappedTrimStart = snapTime(clampedTrimStart);
        onTrimChange(snappedTrimStart, startTrimEnd.current);
      } else if (dragMode === "trim-end" && onTrimChange) {
        const newTrimEnd = startTrimEnd.current + deltaTime;
        const minTrimEnd = Math.max(0, startTrimStart.current) + 0.1;
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

  const silenceWidth = silenceBefore * zoom;

  return (
    <div
      className={`absolute rounded-xl transition-all duration-300 ${
        isSelected ? "glass-edge shadow-glow-cyan-sm z-30" : "hover:shadow-lg z-20"
      } ${track.muted ? "opacity-40 grayscale-[0.5]" : "opacity-100"}`}
      style={{
        left: `${trackLeft}px`,
        width: `${Math.max(trackWidth, 24)}px`,
        height: `${TRACK_HEIGHT}px`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Selection Border Glow */}
      {isSelected && (
        <div className="absolute -inset-[2px] rounded-[14px] bg-gradient-to-r from-primary/50 to-secondary/50 -z-10 animate-pulse" />
      )}

      {/* Left trim handle */}
      {onTrimChange && (
        <div
          className={`absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize z-40 group ${
            dragMode === "trim-start" ? "bg-white/20" : ""
          }`}
          onMouseDown={(e) => handleMouseDown(e, "trim-start")}
          onMouseEnter={() => setIsHoveringHandle("start")}
          onMouseLeave={() => setIsHoveringHandle(null)}
        >
          <div
            className={`absolute inset-y-1.5 left-1 w-1 rounded-full transition-all ${
              isHoveringHandle === "start" || dragMode === "trim-start"
                ? "bg-white shadow-glow-cyan-sm scale-y-110"
                : "bg-white/40 group-hover:bg-white/80"
            }`}
          />
          {(isHoveringHandle === "start" || dragMode === "trim-start") && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 glass-2 border-white/10 rounded text-[10px] text-white font-mono z-50">
              {effectiveTrimStart < 0
                ? `+${(-effectiveTrimStart).toFixed(2)}s`
                : `${effectiveTrimStart.toFixed(2)}s`}
            </div>
          )}
        </div>
      )}

      {/* Right trim handle */}
      {onTrimChange && (
        <div
          className={`absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize z-40 group ${
            dragMode === "trim-end" ? "bg-white/20" : ""
          }`}
          onMouseDown={(e) => handleMouseDown(e, "trim-end")}
          onMouseEnter={() => setIsHoveringHandle("end")}
          onMouseLeave={() => setIsHoveringHandle(null)}
        >
          <div
            className={`absolute inset-y-1.5 right-1 w-1 rounded-full transition-all ${
              isHoveringHandle === "end" || dragMode === "trim-end"
                ? "bg-white shadow-glow-cyan-sm scale-y-110"
                : "bg-white/40 group-hover:bg-white/80"
            }`}
          />
          {(isHoveringHandle === "end" || dragMode === "trim-end") && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 glass-2 border-white/10 rounded text-[10px] text-white font-mono z-50">
              {effectiveTrimEnd.toFixed(2)}s
            </div>
          )}
        </div>
      )}

      {/* Silence region */}
      {silenceBefore > 0 && (
        <div
          className="absolute top-0 bottom-0 bg-white/5 border-r border-dashed border-white/20 overflow-hidden"
          style={{
            left: 0,
            width: `${silenceWidth}px`,
          }}
        >
          <div className="h-full flex items-center justify-center bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.05)_10px,rgba(255,255,255,0.05)_20px)]">
            <span className="text-[9px] text-white/30 font-bold uppercase tracking-tighter">
              Silence
            </span>
          </div>
        </div>
      )}

      {/* Main track content */}
      <div
        className={`absolute top-0 bottom-0 ${trackColor} glass-edge rounded-xl cursor-move shadow-inner transition-colors duration-300`}
        style={{
          left: `${silenceWidth}px`,
          right: 0,
        }}
        onMouseDown={(e) => handleMouseDown(e, "move")}
      >
        <div className="h-full p-2.5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-white font-bold truncate tracking-wide flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
              {track.name}
            </div>
            <div className="flex gap-1">
              {track.muted && (
                <div className="w-2 h-2 rounded-full bg-red-400/80 shadow-[0_0_5px_red]" />
              )}
              {track.solo && (
                <div className="w-2 h-2 rounded-full bg-yellow-300 shadow-[0_0_5px_yellow]" />
              )}
            </div>
          </div>

          <canvas
            ref={canvasRef}
            className="flex-1 w-full rounded-md"
            style={{ imageRendering: "auto" }}
          />
        </div>
      </div>

      {/* Playing pulse effect */}
      {track.isPlaying && (
        <div className="absolute inset-0 rounded-xl border border-white/20 animate-pulse pointer-events-none" />
      )}
    </div>
  );
}

export { TRACK_HEIGHT };
