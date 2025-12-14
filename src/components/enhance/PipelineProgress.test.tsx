import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PipelineProgress, PipelineStageLabel } from "./PipelineProgress";

describe("PipelineProgress", () => {
  describe("stage rendering", () => {
    it("renders all 4 stages", () => {
      render(<PipelineProgress currentStage="ANALYZING" />);

      // Check all stage labels are present (on larger screens)
      expect(screen.getByText("Analyzing")).toBeInTheDocument();
      expect(screen.getByText("Cropping")).toBeInTheDocument();
      expect(screen.getByText("Prompting")).toBeInTheDocument();
      expect(screen.getByText("Generating")).toBeInTheDocument();
    });

    it("shows first stage as current when ANALYZING", () => {
      const { container } = render(<PipelineProgress currentStage="ANALYZING" />);

      // First stage should have animate-pulse class (current stage indicator)
      const stages = container.querySelectorAll(".rounded-md");
      expect(stages[0]).toHaveClass("animate-pulse");
      expect(stages[1]).not.toHaveClass("animate-pulse");
      expect(stages[2]).not.toHaveClass("animate-pulse");
      expect(stages[3]).not.toHaveClass("animate-pulse");
    });

    it("shows second stage as current when CROPPING", () => {
      const { container } = render(<PipelineProgress currentStage="CROPPING" />);

      const stages = container.querySelectorAll(".rounded-md");
      // First stage should be past (green)
      expect(stages[0]).toHaveClass("bg-green-500/20");
      // Second stage should be current
      expect(stages[1]).toHaveClass("animate-pulse");
      expect(stages[2]).not.toHaveClass("animate-pulse");
      expect(stages[3]).not.toHaveClass("animate-pulse");
    });

    it("shows third stage as current when PROMPTING", () => {
      const { container } = render(<PipelineProgress currentStage="PROMPTING" />);

      const stages = container.querySelectorAll(".rounded-md");
      expect(stages[0]).toHaveClass("bg-green-500/20");
      expect(stages[1]).toHaveClass("bg-green-500/20");
      expect(stages[2]).toHaveClass("animate-pulse");
      expect(stages[3]).not.toHaveClass("animate-pulse");
    });

    it("shows fourth stage as current when GENERATING", () => {
      const { container } = render(<PipelineProgress currentStage="GENERATING" />);

      const stages = container.querySelectorAll(".rounded-md");
      expect(stages[0]).toHaveClass("bg-green-500/20");
      expect(stages[1]).toHaveClass("bg-green-500/20");
      expect(stages[2]).toHaveClass("bg-green-500/20");
      expect(stages[3]).toHaveClass("animate-pulse");
    });
  });

  describe("isComplete prop", () => {
    it("shows all stages as complete when isComplete is true", () => {
      const { container } = render(
        <PipelineProgress currentStage="GENERATING" isComplete={true} />,
      );

      const stages = container.querySelectorAll(".rounded-md");
      // All stages should be green (complete)
      expect(stages[0]).toHaveClass("bg-green-500/20");
      expect(stages[1]).toHaveClass("bg-green-500/20");
      expect(stages[2]).toHaveClass("bg-green-500/20");
      expect(stages[3]).toHaveClass("bg-green-500/20");
      // None should be animating
      expect(stages[0]).not.toHaveClass("animate-pulse");
      expect(stages[1]).not.toHaveClass("animate-pulse");
      expect(stages[2]).not.toHaveClass("animate-pulse");
      expect(stages[3]).not.toHaveClass("animate-pulse");
    });

    it("shows all stages as complete even with null currentStage when isComplete", () => {
      const { container } = render(
        <PipelineProgress currentStage={null} isComplete={true} />,
      );

      const stages = container.querySelectorAll(".rounded-md");
      expect(stages[0]).toHaveClass("bg-green-500/20");
      expect(stages[1]).toHaveClass("bg-green-500/20");
      expect(stages[2]).toHaveClass("bg-green-500/20");
      expect(stages[3]).toHaveClass("bg-green-500/20");
    });
  });

  describe("null currentStage", () => {
    it("shows all stages as future when currentStage is null", () => {
      const { container } = render(<PipelineProgress currentStage={null} />);

      const stages = container.querySelectorAll(".rounded-md");
      // All stages should be muted (future)
      expect(stages[0]).toHaveClass("bg-muted");
      expect(stages[1]).toHaveClass("bg-muted");
      expect(stages[2]).toHaveClass("bg-muted");
      expect(stages[3]).toHaveClass("bg-muted");
    });
  });

  describe("connector lines", () => {
    it("renders connector lines between stages", () => {
      const { container } = render(<PipelineProgress currentStage="CROPPING" />);

      // Should have 3 connector lines (between 4 stages)
      const connectors = container.querySelectorAll(".h-0\\.5");
      expect(connectors).toHaveLength(3);
    });

    it("shows completed connector as green", () => {
      const { container } = render(<PipelineProgress currentStage="CROPPING" />);

      const connectors = container.querySelectorAll(".h-0\\.5");
      // First connector (after first stage which is complete)
      expect(connectors[0]).toHaveClass("bg-green-500/50");
    });

    it("shows future connector as muted", () => {
      const { container } = render(<PipelineProgress currentStage="ANALYZING" />);

      const connectors = container.querySelectorAll(".h-0\\.5");
      // Connectors after current stage should be muted
      expect(connectors[0]).toHaveClass("bg-muted");
      expect(connectors[1]).toHaveClass("bg-muted");
      expect(connectors[2]).toHaveClass("bg-muted");
    });
  });

  describe("className prop", () => {
    it("applies custom className", () => {
      const { container } = render(
        <PipelineProgress currentStage="ANALYZING" className="custom-class" />,
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("custom-class");
    });
  });
});

describe("PipelineStageLabel", () => {
  describe("null currentStage", () => {
    it("returns null when currentStage is null", () => {
      const { container } = render(<PipelineStageLabel currentStage={null} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("stage labels", () => {
    it("shows Analyzing label for ANALYZING stage", () => {
      render(<PipelineStageLabel currentStage="ANALYZING" />);
      expect(screen.getByText("Analyzing...")).toBeInTheDocument();
    });

    it("shows Cropping label for CROPPING stage", () => {
      render(<PipelineStageLabel currentStage="CROPPING" />);
      expect(screen.getByText("Cropping...")).toBeInTheDocument();
    });

    it("shows Prompting label for PROMPTING stage", () => {
      render(<PipelineStageLabel currentStage="PROMPTING" />);
      expect(screen.getByText("Prompting...")).toBeInTheDocument();
    });

    it("shows Generating label for GENERATING stage", () => {
      render(<PipelineStageLabel currentStage="GENERATING" />);
      expect(screen.getByText("Generating...")).toBeInTheDocument();
    });
  });

  describe("spinner icon", () => {
    it("shows spinner icon", () => {
      const { container } = render(<PipelineStageLabel currentStage="ANALYZING" />);

      // Check for animate-spin class on the loader
      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });
  });

  describe("className prop", () => {
    it("applies custom className", () => {
      const { container } = render(
        <PipelineStageLabel currentStage="ANALYZING" className="custom-class" />,
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("custom-class");
    });

    it("preserves default classes when custom className is added", () => {
      const { container } = render(
        <PipelineStageLabel currentStage="ANALYZING" className="custom-class" />,
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("inline-flex");
      expect(wrapper).toHaveClass("items-center");
      expect(wrapper).toHaveClass("gap-1");
      expect(wrapper).toHaveClass("text-xs");
      expect(wrapper).toHaveClass("text-muted-foreground");
    });
  });

  describe("invalid stage", () => {
    it("returns null for invalid stage", () => {
      // TypeScript won't allow this normally, but testing edge case
      const { container } = render(
        <PipelineStageLabel currentStage={"INVALID" as "ANALYZING"} />,
      );
      expect(container.firstChild).toBeNull();
    });
  });
});
