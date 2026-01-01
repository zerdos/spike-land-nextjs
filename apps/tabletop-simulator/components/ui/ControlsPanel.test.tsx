import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ControlsPanel } from "./ControlsPanel";

describe("ControlsPanel", () => {
  const defaultProps = {
    mode: "orbit" as const,
    onToggleMode: vi.fn(),
    onDiceRoll: vi.fn(),
    onToggleHand: vi.fn(),
  };

  it("renders the controls panel", () => {
    render(<ControlsPanel {...defaultProps} />);
    expect(screen.getByTestId("controls-panel")).toBeDefined();
  });

  it("shows camera icon in orbit mode", () => {
    render(<ControlsPanel {...defaultProps} mode="orbit" />);
    expect(screen.getByText("📷")).toBeDefined();
  });

  it("shows hand icon in interaction mode", () => {
    render(<ControlsPanel {...defaultProps} mode="interaction" />);
    expect(screen.getByText("✋")).toBeDefined();
  });

  it("calls onToggleMode when mode button is clicked", () => {
    const onToggleMode = vi.fn();
    render(<ControlsPanel {...defaultProps} onToggleMode={onToggleMode} />);

    fireEvent.click(screen.getByTestId("mode-toggle"));
    expect(onToggleMode).toHaveBeenCalledTimes(1);
  });

  it("calls onDiceRoll with d6 when dice button is clicked", () => {
    const onDiceRoll = vi.fn();
    render(<ControlsPanel {...defaultProps} onDiceRoll={onDiceRoll} />);

    fireEvent.click(screen.getByText("🎲"));
    expect(onDiceRoll).toHaveBeenCalledWith("d6");
  });

  it("calls onToggleHand when hand button is clicked", () => {
    const onToggleHand = vi.fn();
    render(<ControlsPanel {...defaultProps} onToggleHand={onToggleHand} />);

    fireEvent.click(screen.getByText("🃏"));
    expect(onToggleHand).toHaveBeenCalledTimes(1);
  });

  it("has correct styling for orbit mode", () => {
    render(<ControlsPanel {...defaultProps} mode="orbit" />);

    const modeButton = screen.getByTestId("mode-toggle");
    // Orbit mode uses gray gradient
    expect(modeButton.className).toContain("from-gray-700");
    expect(modeButton.className).toContain("to-gray-800");
  });

  it("has correct styling for interaction mode", () => {
    render(<ControlsPanel {...defaultProps} mode="interaction" />);

    const modeButton = screen.getByTestId("mode-toggle");
    // Interaction mode uses cyan/blue gradient with ring
    expect(modeButton.className).toContain("from-cyan-500");
    expect(modeButton.className).toContain("to-blue-600");
    expect(modeButton.className).toContain("ring-4");
  });
});
