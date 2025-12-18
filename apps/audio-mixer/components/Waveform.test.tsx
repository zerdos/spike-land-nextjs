/**
 * Waveform Component Tests
 * Resolves #332
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Waveform } from "./Waveform";

// Mock the audio-engine module
vi.mock("../lib/audio-engine", () => ({
  drawWaveform: vi.fn(),
}));

import { drawWaveform } from "../lib/audio-engine";

describe("Waveform", () => {
  const defaultProps = {
    data: [0.5, 0.6, 0.7, 0.8],
    progress: 0.5,
    width: 300,
    height: 60,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders canvas element", () => {
    render(<Waveform {...defaultProps} />);

    const canvas = screen.getByLabelText("Audio waveform visualization");
    expect(canvas).toBeInTheDocument();
    expect(canvas.tagName).toBe("CANVAS");
  });

  it("sets canvas dimensions", () => {
    render(<Waveform {...defaultProps} width={400} height={80} />);

    const canvas = screen.getByLabelText("Audio waveform visualization");
    expect(canvas).toHaveAttribute("width", "400");
    expect(canvas).toHaveAttribute("height", "80");
  });

  it("calls drawWaveform with correct options", () => {
    render(
      <Waveform
        {...defaultProps}
        barColor="#333"
        progressColor="#00f"
      />,
    );

    expect(drawWaveform).toHaveBeenCalledWith(
      expect.any(HTMLCanvasElement),
      defaultProps.data,
      defaultProps.progress,
      expect.objectContaining({
        width: defaultProps.width,
        height: defaultProps.height,
        barColor: "#333",
        progressColor: "#00f",
      }),
    );
  });

  it("handles click events", () => {
    const onClickMock = vi.fn();

    render(<Waveform {...defaultProps} onClick={onClickMock} />);

    const canvas = screen.getByLabelText("Audio waveform visualization");

    // Mock getBoundingClientRect
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      left: 0,
      right: 300,
      top: 0,
      bottom: 60,
      width: 300,
      height: 60,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.click(canvas, { clientX: 150, clientY: 30 });

    expect(onClickMock).toHaveBeenCalledWith(0.5);
  });

  it("clamps click progress between 0 and 1", () => {
    const onClickMock = vi.fn();

    render(<Waveform {...defaultProps} onClick={onClickMock} />);

    const canvas = screen.getByLabelText("Audio waveform visualization");

    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      left: 0,
      right: 300,
      top: 0,
      bottom: 60,
      width: 300,
      height: 60,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.click(canvas, { clientX: 400, clientY: 30 });

    expect(onClickMock).toHaveBeenCalledWith(1);
  });

  it("adds cursor-pointer class when onClick is provided", () => {
    render(<Waveform {...defaultProps} onClick={() => {}} />);

    const canvas = screen.getByLabelText("Audio waveform visualization");
    expect(canvas).toHaveClass("cursor-pointer");
  });

  it("does not add cursor-pointer when onClick is not provided", () => {
    render(<Waveform {...defaultProps} />);

    const canvas = screen.getByLabelText("Audio waveform visualization");
    expect(canvas).not.toHaveClass("cursor-pointer");
  });

  it("does not call onClick when onClick not provided", () => {
    render(<Waveform {...defaultProps} />);

    const canvas = screen.getByLabelText("Audio waveform visualization");

    // Should not throw
    fireEvent.click(canvas, { clientX: 150, clientY: 30 });
  });

  it("uses default colors", () => {
    render(<Waveform data={[0.5]} progress={0} />);

    expect(drawWaveform).toHaveBeenCalledWith(
      expect.any(HTMLCanvasElement),
      [0.5],
      0,
      expect.objectContaining({
        barColor: "#4b5563",
        progressColor: "#3b82f6",
      }),
    );
  });

  it("re-renders when data changes", () => {
    const { rerender } = render(<Waveform {...defaultProps} />);

    vi.clearAllMocks();

    rerender(<Waveform {...defaultProps} data={[0.1, 0.2, 0.3]} />);

    expect(drawWaveform).toHaveBeenCalledWith(
      expect.any(HTMLCanvasElement),
      [0.1, 0.2, 0.3],
      0.5,
      expect.anything(),
    );
  });

  it("does not draw when data is empty", () => {
    render(<Waveform {...defaultProps} data={[]} />);

    expect(drawWaveform).not.toHaveBeenCalled();
  });
});
