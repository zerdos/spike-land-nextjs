import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentProgressIndicator, type AgentStage } from "./AgentProgressIndicator";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode; }) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode; }) => <>{children}</>,
}));

describe("AgentProgressIndicator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when not visible", () => {
    const { container } = render(
      <AgentProgressIndicator
        stage="initialize"
        isVisible={false}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when stage is null", () => {
    const { container } = render(
      <AgentProgressIndicator
        stage={null}
        isVisible={true}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders progress indicator when visible with initialize stage", () => {
    render(
      <AgentProgressIndicator
        stage="initialize"
        isVisible={true}
      />,
    );
    expect(screen.getByText("Agent Working")).toBeInTheDocument();
    // Component shows first simulated log message
    expect(screen.getByText("Resolving neuron endpoint...")).toBeInTheDocument();
  });

  it("renders progress indicator with processing stage", () => {
    render(
      <AgentProgressIndicator
        stage="processing"
        isVisible={true}
      />,
    );
    // Component shows first simulated log message for processing stage
    expect(screen.getByText("Inferring user intent...")).toBeInTheDocument();
  });

  it("shows tool name when executing_tool stage with tool", () => {
    render(
      <AgentProgressIndicator
        stage="executing_tool"
        currentTool="update_code"
        isVisible={true}
      />,
    );
    expect(screen.getByText("Executing update_code...")).toBeInTheDocument();
  });

  it("shows default description when executing_tool without tool", () => {
    render(
      <AgentProgressIndicator
        stage="executing_tool"
        isVisible={true}
      />,
    );
    // Without currentTool, shows first simulated log message
    expect(screen.getByText("Spawning subprocess...")).toBeInTheDocument();
  });

  it("shows error message on error stage", () => {
    render(
      <AgentProgressIndicator
        stage="error"
        errorMessage="Something went wrong"
        isVisible={true}
      />,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("shows default error message when no errorMessage provided", () => {
    render(
      <AgentProgressIndicator
        stage="error"
        isVisible={true}
      />,
    );
    // Without errorMessage, shows first simulated error log
    expect(screen.getByText("Process interrupted.")).toBeInTheDocument();
  });

  it("shows complete stage", () => {
    render(
      <AgentProgressIndicator
        stage="complete"
        isVisible={true}
      />,
    );
    // Shows first simulated complete log
    expect(screen.getByText("Operation completed successfully.")).toBeInTheDocument();
  });

  it("updates elapsed time when startTime is provided", () => {
    const startTime = Date.now();
    render(
      <AgentProgressIndicator
        stage="processing"
        isVisible={true}
        startTime={startTime}
      />,
    );

    // Initial time should be 0.0s
    expect(screen.getByText("0.0s")).toBeInTheDocument();

    // Advance time by 1.5 seconds
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.getByText("1.5s")).toBeInTheDocument();
  });

  it("formats elapsed time in minutes when > 60 seconds", () => {
    const startTime = Date.now();
    render(
      <AgentProgressIndicator
        stage="processing"
        isVisible={true}
        startTime={startTime}
      />,
    );

    // Advance time by 90 seconds
    act(() => {
      vi.advanceTimersByTime(90000);
    });

    expect(screen.getByText("1m 30s")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <AgentProgressIndicator
        stage="initialize"
        isVisible={true}
        className="custom-class"
      />,
    );

    // The custom class should be on the root div
    const rootDiv = container.firstChild as HTMLElement;
    expect(rootDiv).toHaveClass("custom-class");
  });

  it("shows correct stage labels", () => {
    render(
      <AgentProgressIndicator
        stage="processing"
        isVisible={true}
      />,
    );

    // Check that all 4 stage labels are present
    expect(screen.getByText("Initialize")).toBeInTheDocument();
    expect(screen.getByText("Process")).toBeInTheDocument();
    expect(screen.getByText("Execute")).toBeInTheDocument();
    expect(screen.getByText("Validate")).toBeInTheDocument();
  });

  it("shows progress percentage", () => {
    render(
      <AgentProgressIndicator
        stage="processing"
        isVisible={true}
      />,
    );

    // Progress percentage should be displayed
    expect(screen.getByText(/\d+% complete/)).toBeInTheDocument();
  });

  const stages: AgentStage[] = [
    "initialize",
    "processing",
    "executing_tool",
    "validating",
    "complete",
    "error",
  ];

  stages.forEach((stage) => {
    it(`renders correctly for stage: ${stage}`, () => {
      const { container } = render(
        <AgentProgressIndicator
          stage={stage}
          isVisible={true}
        />,
      );
      expect(container.firstChild).not.toBeNull();
    });
  });
});
