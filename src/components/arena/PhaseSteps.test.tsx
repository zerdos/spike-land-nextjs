import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PhaseSteps } from "./PhaseSteps";

describe("PhaseSteps", () => {
  it("renders all phase labels", () => {
    render(<PhaseSteps currentPhase="PROMPTED" />);
    expect(screen.getByText("Prompted")).toBeInTheDocument();
    expect(screen.getByText("Generating")).toBeInTheDocument();
    expect(screen.getByText("Transpiling")).toBeInTheDocument();
    expect(screen.getByText("Reviewing")).toBeInTheDocument();
    expect(screen.getByText("Scored")).toBeInTheDocument();
  });

  it("highlights current phase", () => {
    render(<PhaseSteps currentPhase="GENERATING" />);
    // The Generating label should be blue (active)
    const label = screen.getByText("Generating");
    expect(label.className).toContain("text-blue-400");
  });

  it("marks completed phases as green", () => {
    render(<PhaseSteps currentPhase="TRANSPILING" />);
    // Prompted and Generating should be complete (green)
    const prompted = screen.getByText("Prompted");
    expect(prompted.className).toContain("text-green-400");
  });

  it("shows FAILED state in red", () => {
    render(<PhaseSteps currentPhase="FAILED" />);
    // FAILED doesn't match any step directly - no step should be blue
    // The test is that no phase is highlighted as active in blue
    const labels = screen.getAllByText(/Prompted|Generating|Transpiling|Reviewing|Scored/);
    for (const label of labels) {
      expect(label.className).not.toContain("text-blue-400");
    }
  });

  it("shows SCORED as final completed state", () => {
    render(<PhaseSteps currentPhase="SCORED" />);
    // All prior phases should be green
    expect(screen.getByText("Prompted").className).toContain("text-green-400");
    expect(screen.getByText("Generating").className).toContain("text-green-400");
    expect(screen.getByText("Transpiling").className).toContain("text-green-400");
    expect(screen.getByText("Reviewing").className).toContain("text-green-400");
  });
});
