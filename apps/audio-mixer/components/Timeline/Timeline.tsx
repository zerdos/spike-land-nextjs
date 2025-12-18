/**
 * Timeline Component - Main timeline container with tracks, ruler, and playhead
 */

"use client";

import { useCallback, useEffect, useRef } from "react";
import type { AudioTrack, SnapGrid } from "../../types";
import { Playhead } from "./Playhead";
import { SelectedTrackPanel } from "./SelectedTrackPanel";
import { TimelineControls } from "./TimelineControls";
import { TimelineRuler } from "./TimelineRuler";
import { TimelineTrack, TRACK_HEIGHT } from "./TimelineTrack";

interface TimelineProps {
  tracks: AudioTrack[];
  playheadTime: number;
  isPlaying: boolean;
  zoom: number;
  snapEnabled: boolean;
  snapGrid: SnapGrid;
  selectedTrackId: string | null;
  onTrackPositionChange: (trackId: string, position: number) => void;
  onPlayheadSeek: (time: number) => void;
  onZoomChange: (zoom: number) => void;
  onSnapToggle: (enabled: boolean) => void;
  onSnapGridChange: (grid: SnapGrid) => void;
  onSelectTrack: (trackId: string | null) => void;
  onVolumeChange: (trackId: string, volume: number) => void;
  onMuteToggle: (trackId: string) => void;
  onSoloToggle: (trackId: string) => void;
  onTrimChange: (trackId: string, trimStart: number, trimEnd: number) => void;
  onRemoveTrack: (trackId: string) => void;
  onScrubAudio?: (time: number) => void;
}

const TRACK_ROW_HEIGHT = TRACK_HEIGHT + 8; // Track height + margin

export function Timeline({
  tracks,
  playheadTime,
  isPlaying,
  zoom,
  snapEnabled,
  snapGrid,
  selectedTrackId,
  onTrackPositionChange,
  onPlayheadSeek,
  onZoomChange,
  onSnapToggle,
  onSnapGridChange,
  onSelectTrack,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
  onTrimChange,
  onRemoveTrack,
  onScrubAudio,
}: TimelineProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const isScrubbing = useRef(false);
  const scrubStartX = useRef(0);
  const scrubStartTime = useRef(0);

  // Calculate total duration (including track positions)
  const totalDuration = Math.max(
    10, // Minimum 10 seconds
    ...tracks.map((t) => {
      const effectiveTrimEnd = t.trimEnd > 0 ? t.trimEnd : t.duration;
      const trimmedDuration = effectiveTrimEnd - t.trimStart;
      return (t.position ?? t.delay ?? 0) + trimmedDuration;
    }),
  );

  // Content width with some padding
  const contentWidth = (totalDuration + 5) * zoom;

  // Tracks viewport height
  const tracksHeight = Math.max(200, tracks.length * TRACK_ROW_HEIGHT + 40);

  // Snap time helper
  const snapTime = useCallback(
    (time: number) => {
      if (!snapEnabled) return time;
      return Math.round(time / snapGrid) * snapGrid;
    },
    [snapEnabled, snapGrid],
  );

  // Auto-scroll to follow playhead during playback
  useEffect(() => {
    if (!isPlaying || !viewportRef.current) return;

    const viewport = viewportRef.current;
    const playheadPixels = playheadTime * zoom;
    const viewportWidth = viewport.clientWidth;
    const currentScroll = viewport.scrollLeft;

    // Keep playhead in view (with some margin)
    const margin = viewportWidth * 0.2;
    if (playheadPixels > currentScroll + viewportWidth - margin) {
      viewport.scrollLeft = playheadPixels - margin;
    } else if (playheadPixels < currentScroll + margin) {
      viewport.scrollLeft = Math.max(0, playheadPixels - margin);
    }
  }, [playheadTime, zoom, isPlaying]);

  // Handle scrubbing (stage drag)
  const handleViewportMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only handle clicks on the background, not on tracks
      if (
        e.target !== e.currentTarget && (e.target as HTMLElement).closest("[data-timeline-track]")
      ) {
        return;
      }

      // Shift+click to scrub
      if (!e.shiftKey) {
        // Regular click: deselect track and seek
        onSelectTrack(null);
        const rect = e.currentTarget.getBoundingClientRect();
        const scrollLeft = viewportRef.current?.scrollLeft || 0;
        const x = e.clientX - rect.left + scrollLeft;
        const time = x / zoom;
        onPlayheadSeek(Math.max(0, time));
        return;
      }

      // Shift+drag to scrub
      e.preventDefault();
      isScrubbing.current = true;
      scrubStartX.current = e.clientX;
      scrubStartTime.current = playheadTime;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isScrubbing.current) return;

        const deltaX = moveEvent.clientX - scrubStartX.current;
        const deltaTime = deltaX / zoom;
        const newTime = Math.max(0, scrubStartTime.current + deltaTime);
        onPlayheadSeek(newTime);

        // Play audio snippet for scrub feedback
        if (onScrubAudio) {
          onScrubAudio(newTime);
        }
      };

      const handleMouseUp = () => {
        isScrubbing.current = false;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [zoom, playheadTime, onPlayheadSeek, onSelectTrack, onScrubAudio],
  );

  // Selected track
  const selectedTrack = selectedTrackId
    ? tracks.find((t) => t.id === selectedTrackId) || null
    : null;

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
      {/* Controls */}
      <TimelineControls
        zoom={zoom}
        snapEnabled={snapEnabled}
        snapGrid={snapGrid}
        onZoomChange={onZoomChange}
        onSnapToggle={onSnapToggle}
        onSnapGridChange={onSnapGridChange}
      />

      {/* Ruler */}
      <div className="overflow-x-hidden">
        <div
          className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600"
          style={{ overflowY: "hidden" }}
          ref={(el) => {
            // Sync scroll with tracks viewport
            if (el) {
              el.addEventListener("scroll", () => {
                if (viewportRef.current) {
                  viewportRef.current.scrollLeft = el.scrollLeft;
                }
              });
            }
          }}
        >
          <TimelineRuler
            zoom={zoom}
            duration={totalDuration}
            onSeek={onPlayheadSeek}
          />
        </div>
      </div>

      {/* Tracks viewport */}
      <div
        ref={viewportRef}
        className="relative overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
        style={{ height: `${Math.min(tracksHeight, 400)}px` }}
        onMouseDown={handleViewportMouseDown}
      >
        {/* Content container */}
        <div
          className="relative"
          style={{
            width: `${contentWidth}px`,
            height: `${tracksHeight}px`,
            minWidth: "100%",
          }}
        >
          {/* Track rows */}
          {tracks.map((track, index) => (
            <div
              key={track.id}
              className="absolute left-0 right-0"
              style={{
                top: `${index * TRACK_ROW_HEIGHT + 4}px`,
                height: `${TRACK_HEIGHT}px`,
              }}
              data-timeline-track
            >
              <TimelineTrack
                track={track}
                zoom={zoom}
                isSelected={track.id === selectedTrackId}
                playheadTime={playheadTime}
                snapTime={snapTime}
                onPositionChange={(position) => onTrackPositionChange(track.id, position)}
                onTrimChange={(trimStart, trimEnd) => onTrimChange(track.id, trimStart, trimEnd)}
                onSelect={() => onSelectTrack(track.id)}
              />
            </div>
          ))}

          {/* Playhead */}
          <Playhead
            time={playheadTime}
            zoom={zoom}
            height={tracksHeight}
            onSeek={onPlayheadSeek}
          />

          {/* Empty state */}
          {tracks.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              Add audio files or record to get started
            </div>
          )}
        </div>
      </div>

      {/* Scrub hint */}
      <div className="px-4 py-1 bg-gray-800 border-t border-gray-700 text-xs text-gray-500">
        Click to seek | Shift+drag to scrub | Drag tracks to move | Drag edges to trim
      </div>

      {/* Selected track panel */}
      <SelectedTrackPanel
        track={selectedTrack}
        onVolumeChange={(volume) => selectedTrackId && onVolumeChange(selectedTrackId, volume)}
        onMuteToggle={() => selectedTrackId && onMuteToggle(selectedTrackId)}
        onSoloToggle={() => selectedTrackId && onSoloToggle(selectedTrackId)}
        onTrimChange={(start, end) => selectedTrackId && onTrimChange(selectedTrackId, start, end)}
        onRemove={() => selectedTrackId && onRemoveTrack(selectedTrackId)}
      />
    </div>
  );
}
