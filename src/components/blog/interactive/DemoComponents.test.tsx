import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AttentionSpotlightDemo } from "./AttentionSpotlightDemo";
import { FiveLayerStackDemo } from "./FiveLayerStackDemo";
import { DarwinianTreeDemo } from "./DarwinianTreeDemo";
import { RecursiveZoomDemo } from "./RecursiveZoomDemo";
import { AgentLoopDemo } from "./AgentLoopDemo";
import { BayesianConfidenceDemo } from "./BayesianConfidenceDemo";
import { ModelCascadeDemo } from "./ModelCascadeDemo";
import { SplitScreenDemo } from "./SplitScreenDemo";

// Mock the IntersectionObserver used in useInViewProgress
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
window.IntersectionObserver = MockIntersectionObserver as any;

describe("Blog Interactive Demo Components Smoke Tests", () => {
  it("renders AttentionSpotlightDemo", () => {
    const { container } = render(<AttentionSpotlightDemo />);
    expect(container).toBeTruthy();
  });

  it("renders FiveLayerStackDemo", () => {
    const { container } = render(<FiveLayerStackDemo />);
    expect(container).toBeTruthy();
  });

  it("renders DarwinianTreeDemo", () => {
    const { container } = render(<DarwinianTreeDemo />);
    expect(container).toBeTruthy();
  });

  it("renders RecursiveZoomDemo", () => {
    const { container } = render(<RecursiveZoomDemo />);
    expect(container).toBeTruthy();
  });

  it("renders AgentLoopDemo", () => {
    const { container } = render(<AgentLoopDemo />);
    expect(container).toBeTruthy();
  });

  it("renders BayesianConfidenceDemo", () => {
    const { container } = render(<BayesianConfidenceDemo />);
    expect(container).toBeTruthy();
  });

  it("renders ModelCascadeDemo", () => {
    const { container } = render(<ModelCascadeDemo />);
    expect(container).toBeTruthy();
  });

  it("renders SplitScreenDemo", () => {
    const { container } = render(<SplitScreenDemo />);
    expect(container).toBeTruthy();
  });
});
