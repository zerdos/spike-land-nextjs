/**
 * TimelineControls Component - Zoom and snap controls for the timeline
 */

"use client";

import { Magnet, ZoomIn, ZoomOut } from "lucide-react";
import type { SnapGrid } from "../../types";

interface TimelineControlsProps {
  zoom: number;
  snapEnabled: boolean;
  snapGrid: SnapGrid;
  onZoomChange: (zoom: number) => void;
  onSnapToggle: (enabled: boolean) => void;
  onSnapGridChange: (grid: SnapGrid) => void;
}

const SNAP_GRID_OPTIONS: { value: SnapGrid; label: string; }[] = [
  { value: 0.1, label: "0.1s" },
  { value: 0.25, label: "0.25s" },
  { value: 0.5, label: "0.5s" },
  { value: 1, label: "1s" },
];

export function TimelineControls({
  zoom,
  snapEnabled,
  snapGrid,
  onZoomChange,
  onSnapToggle,
  onSnapGridChange,
}: TimelineControlsProps) {
  const handleZoomIn = () => {
    onZoomChange(Math.min(200, zoom + 10));
  };

  const handleZoomOut = () => {
    onZoomChange(Math.max(10, zoom - 10));
  };

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-gray-800 border-b border-gray-700">
      {/* Zoom controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <input
            type="range"
            min="10"
            max="200"
            step="5"
            value={zoom}
            onChange={(e) => onZoomChange(parseInt(e.target.value))}
            className="w-24 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            aria-label="Timeline zoom"
          />
          <span className="text-xs text-gray-400 w-12">{zoom}px/s</span>
        </div>

        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-700" />

      {/* Snap controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onSnapToggle(!snapEnabled)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-colors ${
            snapEnabled
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-400 hover:text-white"
          }`}
          title={snapEnabled ? "Disable snap to grid" : "Enable snap to grid"}
        >
          <Magnet className="w-3.5 h-3.5" />
          Snap
        </button>

        {snapEnabled && (
          <select
            value={snapGrid}
            onChange={(e) => onSnapGridChange(parseFloat(e.target.value) as SnapGrid)}
            className="px-2 py-1 text-sm bg-gray-700 text-gray-300 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
          >
            {SNAP_GRID_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
