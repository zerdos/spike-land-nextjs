/**
 * SortableTrackList Component Tests
 * Resolves #332
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AudioTrack } from "../types";
import { SortableTrackList } from "./SortableTrackList";

// Mock TrackItem to simplify testing
vi.mock("./TrackItem", () => ({
  TrackItem: ({
    track,
    onPlay,
    onStop,
    onVolumeChange,
    onMuteToggle,
    onSoloToggle,
    onRemove,
    onSeek,
    onDelayChange,
    onTrimChange,
  }: {
    track: AudioTrack;
    onPlay: () => void;
    onStop: () => void;
    onVolumeChange: (volume: number) => void;
    onMuteToggle: () => void;
    onSoloToggle: () => void;
    onRemove: () => void;
    onSeek?: (progress: number) => void;
    onDelayChange?: (delay: number) => void;
    onTrimChange?: (trimStart: number, trimEnd: number) => void;
  }) => (
    <div data-testid={`track-${track.id}`}>
      <span>{track.name}</span>
      <button onClick={onPlay}>Play</button>
      <button onClick={onStop}>Stop</button>
      <button onClick={() => onVolumeChange(0.5)}>Volume</button>
      <button onClick={onMuteToggle}>Mute</button>
      <button onClick={onSoloToggle}>Solo</button>
      <button onClick={onRemove}>Remove</button>
      {onSeek && <button onClick={() => onSeek(0.5)}>Seek</button>}
      {onDelayChange && <button onClick={() => onDelayChange(2)}>Delay</button>}
      {onTrimChange && <button onClick={() => onTrimChange(1, 10)}>Trim</button>}
    </div>
  ),
}));

describe("SortableTrackList", () => {
  const mockTracks: AudioTrack[] = [
    {
      id: "track-1",
      name: "Track 1",
      source: null,
      buffer: null,
      gainNode: null,
      volume: 0.8,
      pan: 0,
      muted: false,
      solo: false,
      isPlaying: false,
      duration: 120,
      currentTime: 0,
      waveformData: [0.5],
      type: "file",
      delay: 0,
      position: 0,
      trimStart: 0,
      trimEnd: 0,
    },
    {
      id: "track-2",
      name: "Track 2",
      source: null,
      buffer: null,
      gainNode: null,
      volume: 0.6,
      pan: 0,
      muted: true,
      solo: false,
      isPlaying: false,
      duration: 90,
      currentTime: 0,
      waveformData: [0.3],
      type: "recording",
      delay: 1,
      position: 0,
      trimStart: 5,
      trimEnd: 85,
    },
  ];

  const defaultProps = {
    tracks: mockTracks,
    onReorder: vi.fn(),
    onPlay: vi.fn(),
    onStop: vi.fn(),
    onVolumeChange: vi.fn(),
    onMuteToggle: vi.fn(),
    onSoloToggle: vi.fn(),
    onRemove: vi.fn(),
  };

  it("renders all tracks", () => {
    render(<SortableTrackList {...defaultProps} />);

    expect(screen.getByText("Track 1")).toBeInTheDocument();
    expect(screen.getByText("Track 2")).toBeInTheDocument();
  });

  it("renders drag handles for each track", () => {
    render(<SortableTrackList {...defaultProps} />);

    const dragHandles = screen.getAllByLabelText("Drag to reorder");
    expect(dragHandles).toHaveLength(2);
  });

  it("calls onPlay with track id", () => {
    render(<SortableTrackList {...defaultProps} />);

    const playButtons = screen.getAllByText("Play");
    fireEvent.click(playButtons[0]!);

    expect(defaultProps.onPlay).toHaveBeenCalledWith("track-1");
  });

  it("calls onStop with track id", () => {
    render(<SortableTrackList {...defaultProps} />);

    const stopButtons = screen.getAllByText("Stop");
    fireEvent.click(stopButtons[1]!);

    expect(defaultProps.onStop).toHaveBeenCalledWith("track-2");
  });

  it("calls onVolumeChange with track id and volume", () => {
    render(<SortableTrackList {...defaultProps} />);

    const volumeButtons = screen.getAllByText("Volume");
    fireEvent.click(volumeButtons[0]!);

    expect(defaultProps.onVolumeChange).toHaveBeenCalledWith("track-1", 0.5);
  });

  it("calls onMuteToggle with track id", () => {
    render(<SortableTrackList {...defaultProps} />);

    const muteButtons = screen.getAllByText("Mute");
    fireEvent.click(muteButtons[0]!);

    expect(defaultProps.onMuteToggle).toHaveBeenCalledWith("track-1");
  });

  it("calls onSoloToggle with track id", () => {
    render(<SortableTrackList {...defaultProps} />);

    const soloButtons = screen.getAllByText("Solo");
    fireEvent.click(soloButtons[1]!);

    expect(defaultProps.onSoloToggle).toHaveBeenCalledWith("track-2");
  });

  it("calls onRemove with track id", () => {
    render(<SortableTrackList {...defaultProps} />);

    const removeButtons = screen.getAllByText("Remove");
    fireEvent.click(removeButtons[0]!);

    expect(defaultProps.onRemove).toHaveBeenCalledWith("track-1");
  });

  it("calls onSeek with track id and progress when provided", () => {
    const onSeek = vi.fn();
    render(<SortableTrackList {...defaultProps} onSeek={onSeek} />);

    const seekButtons = screen.getAllByText("Seek");
    fireEvent.click(seekButtons[0]!);

    expect(onSeek).toHaveBeenCalledWith("track-1", 0.5);
  });

  it("does not render seek button when onSeek not provided", () => {
    render(<SortableTrackList {...defaultProps} />);

    expect(screen.queryByText("Seek")).not.toBeInTheDocument();
  });

  it("calls onDelayChange with track id and delay when provided", () => {
    const onDelayChange = vi.fn();
    render(
      <SortableTrackList {...defaultProps} onDelayChange={onDelayChange} />,
    );

    const delayButtons = screen.getAllByText("Delay");
    fireEvent.click(delayButtons[1]!);

    expect(onDelayChange).toHaveBeenCalledWith("track-2", 2);
  });

  it("does not render delay button when onDelayChange not provided", () => {
    render(<SortableTrackList {...defaultProps} />);

    expect(screen.queryByText("Delay")).not.toBeInTheDocument();
  });

  it("calls onTrimChange with track id and trim values when provided", () => {
    const onTrimChange = vi.fn();
    render(<SortableTrackList {...defaultProps} onTrimChange={onTrimChange} />);

    const trimButtons = screen.getAllByText("Trim");
    fireEvent.click(trimButtons[0]!);

    expect(onTrimChange).toHaveBeenCalledWith("track-1", 1, 10);
  });

  it("does not render trim button when onTrimChange not provided", () => {
    render(<SortableTrackList {...defaultProps} />);

    expect(screen.queryByText("Trim")).not.toBeInTheDocument();
  });

  it("renders empty list when no tracks", () => {
    render(<SortableTrackList {...defaultProps} tracks={[]} />);

    expect(screen.queryByText("Track 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Track 2")).not.toBeInTheDocument();
  });

  it("renders single track correctly", () => {
    render(<SortableTrackList {...defaultProps} tracks={[mockTracks[0]!]} />);

    expect(screen.getByText("Track 1")).toBeInTheDocument();
    expect(screen.queryByText("Track 2")).not.toBeInTheDocument();
    expect(screen.getAllByLabelText("Drag to reorder")).toHaveLength(1);
  });

  it("renders tracks in order", () => {
    render(<SortableTrackList {...defaultProps} />);

    const trackElements = screen.getAllByTestId(/track-/);
    expect(trackElements[0]).toHaveAttribute("data-testid", "track-track-1");
    expect(trackElements[1]).toHaveAttribute("data-testid", "track-track-2");
  });
});
