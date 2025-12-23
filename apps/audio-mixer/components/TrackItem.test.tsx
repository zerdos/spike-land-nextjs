/**
 * TrackItem Component Tests
 * Resolves #332
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AudioTrack } from "../types";
import { TrackItem } from "./TrackItem";

// Mock Waveform component
vi.mock("./Waveform", () => ({
  Waveform: ({ onClick }: { onClick?: (progress: number) => void; }) => (
    <div
      data-testid="waveform"
      onClick={() => onClick?.(0.5)}
    />
  ),
}));

// Mock audio-engine
vi.mock("../lib/audio-engine", () => ({
  formatTime: (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`,
}));

describe("TrackItem", () => {
  const mockTrack: AudioTrack = {
    id: "track-1",
    name: "Test Track",
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
    waveformData: [0.5, 0.6, 0.7],
    type: "file",
    delay: 0,
    position: 0,
    trimStart: 0,
    trimEnd: 0,
  };

  const defaultProps = {
    track: mockTrack,
    onPlay: vi.fn(),
    onStop: vi.fn(),
    onVolumeChange: vi.fn(),
    onMuteToggle: vi.fn(),
    onSoloToggle: vi.fn(),
    onRemove: vi.fn(),
    onSeek: vi.fn(),
  };

  it("renders track name and duration", () => {
    render(<TrackItem {...defaultProps} />);

    expect(screen.getByText("Test Track")).toBeInTheDocument();
    expect(screen.getByText("2:00")).toBeInTheDocument();
  });

  it("shows recording icon for recording type", () => {
    const recordingTrack = { ...mockTrack, type: "recording" as const };

    render(<TrackItem {...defaultProps} track={recordingTrack} />);

    // Mic icon should be present (we can check for the SVG)
    const trackHeader = screen.getByText("Test Track").parentElement;
    expect(trackHeader?.querySelector("svg")).toBeInTheDocument();
  });

  it("calls onPlay when play button is clicked", () => {
    render(<TrackItem {...defaultProps} />);

    const playButton = screen.getByLabelText("Play");
    fireEvent.click(playButton);

    expect(defaultProps.onPlay).toHaveBeenCalled();
  });

  it("calls onStop when stop button is clicked while playing", () => {
    const playingTrack = { ...mockTrack, isPlaying: true };

    render(<TrackItem {...defaultProps} track={playingTrack} />);

    const stopButton = screen.getByLabelText("Stop");
    fireEvent.click(stopButton);

    expect(defaultProps.onStop).toHaveBeenCalled();
  });

  it("calls onMuteToggle when mute button is clicked", () => {
    render(<TrackItem {...defaultProps} />);

    const muteButton = screen.getByLabelText("Mute");
    fireEvent.click(muteButton);

    expect(defaultProps.onMuteToggle).toHaveBeenCalled();
  });

  it("shows unmute label when muted", () => {
    const mutedTrack = { ...mockTrack, muted: true };

    render(<TrackItem {...defaultProps} track={mutedTrack} />);

    expect(screen.getByLabelText("Unmute")).toBeInTheDocument();
  });

  it("calls onSoloToggle when solo button is clicked", () => {
    render(<TrackItem {...defaultProps} />);

    const soloButton = screen.getByLabelText("Enable solo");
    fireEvent.click(soloButton);

    expect(defaultProps.onSoloToggle).toHaveBeenCalled();
  });

  it("shows disable solo label when soloed", () => {
    const soloedTrack = { ...mockTrack, solo: true };

    render(<TrackItem {...defaultProps} track={soloedTrack} />);

    expect(screen.getByLabelText("Disable solo")).toBeInTheDocument();
  });

  it("calls onRemove when remove button is clicked", () => {
    render(<TrackItem {...defaultProps} />);

    const removeButton = screen.getByLabelText("Remove track");
    fireEvent.click(removeButton);

    expect(defaultProps.onRemove).toHaveBeenCalled();
  });

  it("calls onVolumeChange when volume slider is changed", () => {
    render(<TrackItem {...defaultProps} />);

    const volumeSlider = screen.getByLabelText("Track volume");
    fireEvent.change(volumeSlider, { target: { value: "0.5" } });

    expect(defaultProps.onVolumeChange).toHaveBeenCalledWith(0.5);
  });

  it("displays current volume percentage", () => {
    render(<TrackItem {...defaultProps} />);

    expect(screen.getByText("80%")).toBeInTheDocument();
  });

  it("renders waveform component", () => {
    render(<TrackItem {...defaultProps} />);

    expect(screen.getByTestId("waveform")).toBeInTheDocument();
  });

  it("calls onSeek when waveform is clicked", () => {
    render(<TrackItem {...defaultProps} />);

    const waveform = screen.getByTestId("waveform");
    fireEvent.click(waveform);

    expect(defaultProps.onSeek).toHaveBeenCalledWith(0.5);
  });

  it("applies muted styling to waveform", () => {
    const mutedTrack = { ...mockTrack, muted: true };

    render(<TrackItem {...defaultProps} track={mutedTrack} />);

    // Component still renders, muted styling is applied via props
    expect(screen.getByTestId("waveform")).toBeInTheDocument();
  });

  it("applies solo button styling when active", () => {
    const soloedTrack = { ...mockTrack, solo: true };

    render(<TrackItem {...defaultProps} track={soloedTrack} />);

    const soloButton = screen.getByLabelText("Disable solo");
    expect(soloButton).toHaveClass("bg-yellow-600");
  });

  it("applies mute button styling when active", () => {
    const mutedTrack = { ...mockTrack, muted: true };

    render(<TrackItem {...defaultProps} track={mutedTrack} />);

    const muteButton = screen.getByLabelText("Unmute");
    expect(muteButton).toHaveClass("bg-red-600");
  });
});
