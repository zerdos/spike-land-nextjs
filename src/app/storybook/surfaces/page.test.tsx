import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SurfacesPage from "./page";

// Mock resize observer which might be used by some components
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

describe("SurfacesPage", () => {
  it("renders the page header correctly", () => {
    render(<SurfacesPage />);
    expect(screen.getByText("Surfaces & Elevation")).toBeDefined();
    expect(
      screen.getByText(/Our physical model within the digital space/i),
    ).toBeDefined();
  });

  it("renders usage guide", () => {
    render(<SurfacesPage />);
    expect(screen.getByText("Do")).toBeDefined();
    expect(screen.getByText("Don't")).toBeDefined();
    expect(screen.getByText(/Use Tier 1 \(glass-1\)/i)).toBeDefined();
  });

  it("renders glass tiers section", () => {
    render(<SurfacesPage />);
    expect(screen.getByText("Glass Morphism Tiers")).toBeDefined();
    expect(screen.getByText("Tier 0 (glass-0)")).toBeDefined();
    expect(screen.getByText("Tier 1 (glass-1)")).toBeDefined();
    expect(screen.getByText("Tier 2 (glass-2)")).toBeDefined();
  });

  it("renders shadow-based surfaces section", () => {
    render(<SurfacesPage />);
    expect(screen.getByText("Shadow-based Surfaces")).toBeDefined();
    expect(screen.getByText("Negative (Inset)")).toBeDefined();
    expect(screen.getByText("Floating (Elevation)")).toBeDefined();
  });

  it("renders vibrant aura surfaces section", () => {
    render(<SurfacesPage />);
    expect(screen.getByText("Vibrant Aura Surfaces")).toBeDefined();
    expect(screen.getByText("Sky Aura")).toBeDefined();
    expect(screen.getByText("Neon Aura")).toBeDefined();
  });

  it("renders high-fidelity layers section", () => {
    render(<SurfacesPage />);
    expect(screen.getByText("High-Fidelity Layers")).toBeDefined();
    expect(screen.getByText("Settings Panel Example")).toBeDefined();
    expect(screen.getByText("Visual Content Overlay")).toBeDefined();
  });

  it("copies class name to clipboard when clicking a glass tier", async () => {
    render(<SurfacesPage />);
    const glass0Group = screen.getByText("Tier 0 (glass-0)").closest(".group");
    expect(glass0Group).toBeDefined();
    // The click listener is on the card div inside the group
    const card = glass0Group!.querySelector(".glass-0");
    expect(card).toBeDefined();
    fireEvent.click(card!);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("glass-0");
    expect(await screen.findByText("Copied!")).toBeDefined();
  });
});
