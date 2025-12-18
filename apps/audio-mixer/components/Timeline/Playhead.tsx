/**
 * Playhead Component - Vertical line indicating current playback position
 */

"use client";

import { useCallback, useRef } from "react";

interface PlayheadProps {
  time: number;
  zoom: number;
  height: number;
  onSeek?: (time: number) => void;
}

export function Playhead({ time, zoom, height, onSeek }: PlayheadProps) {
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startTime = useRef(0);

  const position = time * zoom;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!onSeek) return;
      e.preventDefault();
      e.stopPropagation();

      isDragging.current = true;
      startX.current = e.clientX;
      startTime.current = time;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isDragging.current) return;

        const deltaX = moveEvent.clientX - startX.current;
        const deltaTime = deltaX / zoom;
        const newTime = Math.max(0, startTime.current + deltaTime);
        onSeek(newTime);
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [time, zoom, onSeek],
  );

  return (
    <div
      className="absolute top-0 z-20 pointer-events-none"
      style={{
        left: `${position}px`,
        height: `${height}px`,
      }}
    >
      {/* Playhead handle (draggable) */}
      <div
        className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 rounded-full cursor-ew-resize pointer-events-auto hover:bg-red-400 transition-colors shadow-lg"
        onMouseDown={handleMouseDown}
        title="Drag to seek"
      />
      {/* Playhead line */}
      <div
        className="w-0.5 bg-red-500 shadow-lg"
        style={{ height: `${height}px` }}
      />
    </div>
  );
}
