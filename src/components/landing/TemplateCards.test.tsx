import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TemplateCards } from "./TemplateCards";

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);

describe("TemplateCards", () => {
  it("renders all template buttons", () => {
    render(<TemplateCards onSelect={vi.fn()} />);
    expect(screen.getByText("Game")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Todo App")).toBeInTheDocument();
    expect(screen.getByText("Music Player")).toBeInTheDocument();
    expect(screen.getByText("3D Scene")).toBeInTheDocument();
    expect(screen.getByText("Gallery")).toBeInTheDocument();
  });

  it("calls onSelect with the correct prompt when a card is clicked", () => {
    const onSelect = vi.fn();
    render(<TemplateCards onSelect={onSelect} />);

    fireEvent.click(screen.getByText("Game"));
    expect(onSelect).toHaveBeenCalledWith("Build a fun browser game");

    fireEvent.click(screen.getByText("Dashboard"));
    expect(onSelect).toHaveBeenCalledWith("Create a data dashboard with charts");
  });

  it("renders buttons with type=button", () => {
    render(<TemplateCards onSelect={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(6);
    for (const button of buttons) {
      expect(button).toHaveAttribute("type", "button");
    }
  });
});
