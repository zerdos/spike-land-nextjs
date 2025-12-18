/**
 * RecordingPanel Component Tests
 * Resolves #332
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecordingPanel } from "./RecordingPanel";

// Mock audio-engine
vi.mock("../lib/audio-engine", () => ({
  formatTime: (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`,
}));

describe("RecordingPanel", () => {
  const defaultProps = {
    isRecording: false,
    isPaused: false,
    duration: 0,
    onStart: vi.fn(),
    onPause: vi.fn(),
    onResume: vi.fn(),
    onStop: vi.fn(),
    onCancel: vi.fn(),
  };

  it("renders record button when not recording", () => {
    render(<RecordingPanel {...defaultProps} />);

    expect(screen.getByText("Record")).toBeInTheDocument();
  });

  it("calls onStart when record button is clicked", () => {
    render(<RecordingPanel {...defaultProps} />);

    const recordButton = screen.getByText("Record");
    fireEvent.click(recordButton);

    expect(defaultProps.onStart).toHaveBeenCalled();
  });

  it("shows recording controls when recording", () => {
    render(<RecordingPanel {...defaultProps} isRecording={true} duration={30} />);

    expect(screen.getByText("0:30")).toBeInTheDocument();
    expect(screen.getByLabelText("Pause recording")).toBeInTheDocument();
    expect(screen.getByLabelText("Stop and save recording")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("shows pulsing indicator when recording", () => {
    const { container } = render(<RecordingPanel {...defaultProps} isRecording={true} />);

    const indicator = container.querySelector(".animate-pulse");
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass("bg-red-500");
  });

  it("shows yellow indicator when paused", () => {
    const { container } = render(
      <RecordingPanel {...defaultProps} isRecording={true} isPaused={true} />,
    );

    const indicator = container.querySelector(".bg-yellow-500");
    expect(indicator).toBeInTheDocument();
    expect(indicator).not.toHaveClass("animate-pulse");
  });

  it("calls onPause when pause button is clicked", () => {
    render(<RecordingPanel {...defaultProps} isRecording={true} />);

    const pauseButton = screen.getByLabelText("Pause recording");
    fireEvent.click(pauseButton);

    expect(defaultProps.onPause).toHaveBeenCalled();
  });

  it("calls onResume when resume button is clicked while paused", () => {
    render(<RecordingPanel {...defaultProps} isRecording={true} isPaused={true} />);

    const resumeButton = screen.getByLabelText("Resume recording");
    fireEvent.click(resumeButton);

    expect(defaultProps.onResume).toHaveBeenCalled();
  });

  it("calls onStop when stop button is clicked", () => {
    render(<RecordingPanel {...defaultProps} isRecording={true} />);

    const stopButton = screen.getByLabelText("Stop and save recording");
    fireEvent.click(stopButton);

    expect(defaultProps.onStop).toHaveBeenCalled();
  });

  it("calls onCancel when cancel button is clicked", () => {
    render(<RecordingPanel {...defaultProps} isRecording={true} />);

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it("formats duration correctly", () => {
    render(<RecordingPanel {...defaultProps} isRecording={true} duration={125} />);

    expect(screen.getByText("2:05")).toBeInTheDocument();
  });
});
