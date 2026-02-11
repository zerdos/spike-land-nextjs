import { render } from "@testing-library/react";
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

describe("Core Components Smoke Tests", () => {
  it("renders AttentionSpotlightCore", () => {
    const { container } = render(<AttentionSpotlightCore progress={0.5} tokenCount={10} />);
    expect(container.querySelector("svg")).toBeTruthy();
    expect(container.textContent).toContain("10 tokens");
  });

  it("renders FiveLayerStackCore", () => {
    const { container } = render(<FiveLayerStackCore progress={0.5} revealCount={3} />);
    expect(container.childNodes.length).toBeGreaterThan(0);
  });

  it("renders DarwinianTreeCore", () => {
    const { container } = render(<DarwinianTreeCore progress={0.5} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders RecursiveZoomCore", () => {
    const { getByText } = render(<RecursiveZoomCore progress={0.5} labels={["A", "B"]} />);
    expect(getByText("A")).toBeTruthy();
  });

  it("renders AgentLoopCore", () => {
    const { getByText } = render(<AgentLoopCore progress={0.5} revealCount={7} activeState={1} />);
    expect(getByText("Planning")).toBeTruthy();
  });

  it("renders BayesianConfidenceCore", () => {
    const { container } = render(<BayesianConfidenceCore progress={0.5} helps={3} fails={1} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders ModelCascadeCore", () => {
    const { container } = render(<ModelCascadeCore progress={0.5} revealCount={3} />);
    expect(container.textContent).toBeTruthy();
  });

  it("renders SplitScreenCore", () => {
    const { getByText } = render(
      <SplitScreenCore
        progress={0.5}
        leftContent={<div>LeftContent</div>}
        rightContent={<div>RightContent</div>}
      />
    );
    expect(getByText("LeftContent")).toBeTruthy();
    expect(getByText("RightContent")).toBeTruthy();
  });

  it("renders GlassmorphismCardCore", () => {
    const { getByText } = render(
      <GlassmorphismCardCore className="test-card">
        <div>Card Content</div>
      </GlassmorphismCardCore>
    );
    expect(getByText("Card Content")).toBeTruthy();
  });
});
