
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AttentionSpotlightCore } from "./AttentionSpotlightCore";
import { FiveLayerStackCore } from "./FiveLayerStackCore";
import { DarwinianTreeCore } from "./DarwinianTreeCore";
import { RecursiveZoomCore } from "./RecursiveZoomCore";
import { AgentLoopCore } from "./AgentLoopCore";
import { BayesianConfidenceCore } from "./BayesianConfidenceCore";
import { ModelCascadeCore } from "./ModelCascadeCore";
import { SplitScreenCore } from "./SplitScreenCore";

import { GlassmorphismCardCore } from "./ui/GlassmorphismCardCore";
import { interpolate, clamp, seededRandom } from "../../lib/animation-utils";

describe("Animation Utils", () => {
  it("interpolates values correctly", () => {
    expect(interpolate(0.5, [0, 1], [0, 100])).toBe(50);
    expect(interpolate(0, [0, 1], [0, 100])).toBe(0);
    expect(interpolate(1, [0, 1], [0, 100])).toBe(100);
  });

  it("handles out of bounds interpolation (clamping)", () => {
    expect(interpolate(-1, [0, 1], [0, 100])).toBe(0);
    expect(interpolate(2, [0, 1], [0, 100])).toBe(100);
  });

  it("interpolates piecewise linear functions", () => {
    const input = [0, 0.5, 1];
    const output = [0, 100, 50];
    expect(interpolate(0.25, input, output)).toBe(50);
    expect(interpolate(0.75, input, output)).toBe(75);
  });

  it("guards against division by zero", () => {
    // Input range has zero width
    expect(interpolate(0.5, [0, 0], [0, 100])).toBe(0);
  });

  it("clamps values", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it("generates deterministic random numbers", () => {
    expect(seededRandom(123)).toBe(seededRandom(123));
    expect(seededRandom(123)).not.toBe(seededRandom(456));
  });
});

describe("Core Components Smoke Tests", () => {
  it("renders AttentionSpotlightCore with correct tokens", () => {
    const { container } = render(<AttentionSpotlightCore progress={0.5} tokenCount={10} />);
    expect(container.querySelector("svg")).toBeTruthy();
    expect(container.querySelectorAll("circle").length).toBeGreaterThan(10); // Tokens + glow
    expect(container.textContent).toContain("10 tokens");
  });

  it("renders FiveLayerStackCore layers", () => {
    render(<FiveLayerStackCore progress={1} revealCount={5} />);
    // Check for layer names
    expect(screen.getByText("System Prompt")).toBeTruthy();
    expect(screen.getByText("World Context")).toBeTruthy();
  });

  it("renders DarwinianTreeCore branches", () => {
    const { container } = render(<DarwinianTreeCore progress={1} generations={3} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    // Should have lines for branches
    expect(svg?.querySelectorAll("line").length).toBeGreaterThan(5);
  });

  it("renders RecursiveZoomCore labels", () => {
    const labels = ["Layer 1", "Layer 2", "Layer 3"];
    render(<RecursiveZoomCore progress={0.5} labels={labels} />);
    expect(screen.getByText("Layer 1")).toBeTruthy();
    expect(screen.getAllByText(/Layer/i).length).toBeGreaterThan(0);
  });

  it("renders AgentLoopCore states and active highlight", () => {
    render(<AgentLoopCore progress={1} revealCount={7} activeState={0} />);
    const planningNode = screen.getByText("Planning");
    expect(planningNode).toBeTruthy();
    // Active state has different background/border - implicit check via styling not easy in unit test, 
    // but we verify it renders without crashing.
  });

  it("renders BayesianConfidenceCore stats", () => {
    render(<BayesianConfidenceCore progress={1} helps={10} fails={0} />);
    expect(screen.getByText("ACTIVE")).toBeTruthy(); // High confidence
    expect(screen.getByText("10")).toBeTruthy(); // Helps count
  });

  it("renders ModelCascadeCore rows", () => {
    render(<ModelCascadeCore progress={1} revealCount={3} />);
    expect(screen.getByText("Opus")).toBeTruthy();
    expect(screen.getByText("Sonnet")).toBeTruthy();
    expect(screen.getByText("Haiku")).toBeTruthy();
  });

  it("renders SplitScreenCore content", () => {
    render(
      <SplitScreenCore
        progress={0.5}
        leftContent={<div data-testid="left">Left</div>}
        rightContent={<div data-testid="right">Right</div>}
      />
    );
    expect(screen.getByTestId("left")).toBeTruthy();
    expect(screen.getByTestId("right")).toBeTruthy();
  });

  it("renders GlassmorphismCardCore with style props", () => {
    const { container } = render(
      <GlassmorphismCardCore className="test-card" style={{ marginTop: 20 }}>
        <div>Card Content</div>
      </GlassmorphismCardCore>
    );
    expect(screen.getByText("Card Content")).toBeTruthy();
    const card = container.firstChild as HTMLElement;
    expect(card.style.marginTop).toBe("20px");
  });
});
