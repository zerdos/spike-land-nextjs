import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DropZoneIndicator } from "./DropZoneIndicator";

describe("DropZoneIndicator Component", () => {
  it("should not render when isActive is false", () => {
    render(<DropZoneIndicator isActive={false} />);

    expect(screen.queryByTestId("drop-zone-indicator")).not.toBeInTheDocument();
  });

  it("should render when isActive is true", () => {
    render(<DropZoneIndicator isActive={true} />);

    expect(screen.getByTestId("drop-zone-indicator")).toBeInTheDocument();
  });

  it("should render with default label", () => {
    render(<DropZoneIndicator isActive={true} />);

    expect(screen.getByTestId("drop-zone-label")).toHaveTextContent(
      "Drop to add to album",
    );
  });

  it("should render with custom label", () => {
    render(<DropZoneIndicator isActive={true} label="Drop files here" />);

    expect(screen.getByTestId("drop-zone-label")).toHaveTextContent(
      "Drop files here",
    );
  });

  it("should apply custom className", () => {
    render(<DropZoneIndicator isActive={true} className="custom-class" />);

    const indicator = screen.getByTestId("drop-zone-indicator");
    expect(indicator).toHaveClass("custom-class");
  });

  it("should have pointer-events-none class to not block mouse events", () => {
    render(<DropZoneIndicator isActive={true} />);

    const indicator = screen.getByTestId("drop-zone-indicator");
    expect(indicator).toHaveClass("pointer-events-none");
  });

  it("should have aria-hidden attribute for accessibility", () => {
    render(<DropZoneIndicator isActive={true} />);

    const indicator = screen.getByTestId("drop-zone-indicator");
    expect(indicator).toHaveAttribute("aria-hidden", "true");
  });

  it("should render the background overlay", () => {
    render(<DropZoneIndicator isActive={true} />);

    expect(screen.getByTestId("drop-zone-overlay")).toBeInTheDocument();
  });

  it("should render the animated border", () => {
    render(<DropZoneIndicator isActive={true} />);

    const border = screen.getByTestId("drop-zone-border");
    expect(border).toBeInTheDocument();
    expect(border).toHaveClass("animate-pulse");
  });

  it("should render the content container", () => {
    render(<DropZoneIndicator isActive={true} />);

    expect(screen.getByTestId("drop-zone-content")).toBeInTheDocument();
  });

  it("should render the upload icon", () => {
    render(<DropZoneIndicator isActive={true} />);

    expect(screen.getByTestId("drop-zone-icon")).toBeInTheDocument();
  });

  it("should have absolute positioning classes", () => {
    render(<DropZoneIndicator isActive={true} />);

    const indicator = screen.getByTestId("drop-zone-indicator");
    expect(indicator).toHaveClass("absolute");
    expect(indicator).toHaveClass("inset-0");
  });

  it("should have z-50 class for proper stacking", () => {
    render(<DropZoneIndicator isActive={true} />);

    const indicator = screen.getByTestId("drop-zone-indicator");
    expect(indicator).toHaveClass("z-50");
  });

  it("should have flex centering classes", () => {
    render(<DropZoneIndicator isActive={true} />);

    const indicator = screen.getByTestId("drop-zone-indicator");
    expect(indicator).toHaveClass("flex");
    expect(indicator).toHaveClass("items-center");
    expect(indicator).toHaveClass("justify-center");
  });

  it("should have transition classes for smooth appearance", () => {
    render(<DropZoneIndicator isActive={true} />);

    const indicator = screen.getByTestId("drop-zone-indicator");
    expect(indicator).toHaveClass("transition-all");
    expect(indicator).toHaveClass("duration-200");
  });

  it("should have dashed border on the border element", () => {
    render(<DropZoneIndicator isActive={true} />);

    const border = screen.getByTestId("drop-zone-border");
    expect(border).toHaveClass("border-dashed");
    expect(border).toHaveClass("border-primary");
  });

  it("should render with empty string label", () => {
    render(<DropZoneIndicator isActive={true} label="" />);

    const label = screen.getByTestId("drop-zone-label");
    expect(label).toHaveTextContent("");
  });

  it("should apply bounce animation to content container", () => {
    render(<DropZoneIndicator isActive={true} />);

    const content = screen.getByTestId("drop-zone-content");
    expect(content).toHaveClass("animate-drop-zone-bounce");
  });
});
