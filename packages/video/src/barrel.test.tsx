import { describe, it, expect } from "vitest";
import * as Core from "./src/components/core";
import * as Veritasium from "./src/compositions/veritasium";

describe("Barrel Exports", () => {
  it("exports all core components", () => {
    expect(Core.AgentLoopCore).toBeDefined();
    expect(Core.AttentionSpotlightCore).toBeDefined();
    expect(Core.BayesianConfidenceCore).toBeDefined();
    expect(Core.DarwinianTreeCore).toBeDefined();
    expect(Core.FiveLayerStackCore).toBeDefined();
    expect(Core.ModelCascadeCore).toBeDefined();
    expect(Core.RecursiveZoomCore).toBeDefined();
    expect(Core.SplitScreenCore).toBeDefined();
    expect(Core.GlassmorphismCardCore).toBeDefined();
  });

  it("exports all Veritasium scenes", () => {
    expect(Veritasium.Scene05_Memory).toBeDefined();
    expect(Veritasium.Scene06_Cascade).toBeDefined();
  });
});
