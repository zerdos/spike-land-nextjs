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

describe("Core Components Smoke Tests", () => {
  it("renders AttentionSpotlightCore", () => {
    const { container } = render(<AttentionSpotlightCore progress={0.5} tokenCount={10} />);
    expect(container).toBeTruthy();
  });

  it("renders FiveLayerStackCore", () => {
    const { container } = render(<FiveLayerStackCore progress={0.5} revealCount={3} />);
    expect(container).toBeTruthy();
  });

  it("renders DarwinianTreeCore", () => {
    const { container } = render(<DarwinianTreeCore progress={0.5} />);
    expect(container).toBeTruthy();
  });

  it("renders RecursiveZoomCore", () => {
    const { container } = render(<RecursiveZoomCore progress={0.5} labels={["A", "B"]} />);
    expect(container).toBeTruthy();
  });

  it("renders AgentLoopCore", () => {
    const { container } = render(<AgentLoopCore progress={0.5} revealCount={7} activeState={1} />);
    expect(container).toBeTruthy();
  });

  it("renders BayesianConfidenceCore", () => {
    const { container } = render(<BayesianConfidenceCore progress={0.5} helps={3} fails={1} />);
    expect(container).toBeTruthy();
  });

  it("renders ModelCascadeCore", () => {
    const { container } = render(<ModelCascadeCore progress={0.5} revealCount={3} />);
    expect(container).toBeTruthy();
  });

  it("renders SplitScreenCore", () => {
    const { container } = render(
      <SplitScreenCore
        progress={0.5}
        leftContent={<div>Left</div>}
        rightContent={<div>Right</div>}
      />
    );
    expect(container).toBeTruthy();
  });
});
