import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ParallelJobsProgress } from "./ParallelJobsProgress";

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown; }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} data-testid="next-image" />
  ),
}));

const createJob = (
  tier: "TIER_1K" | "TIER_2K" | "TIER_4K",
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED",
  overrides: Partial<{
    jobId: string;
    enhancedUrl: string;
    error: string;
  }> = {},
) => ({
  jobId: overrides.jobId ?? `job-${tier}`,
  tier,
  status,
  enhancedUrl: overrides.enhancedUrl,
  error: overrides.error,
});

describe("ParallelJobsProgress Component", () => {
  describe("Rendering", () => {
    it("renders nothing when jobs array is empty", () => {
      const { container } = render(<ParallelJobsProgress jobs={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it("renders the progress container with jobs", () => {
      const jobs = [createJob("TIER_1K", "PENDING")];
      render(<ParallelJobsProgress jobs={jobs} />);
      expect(screen.getByTestId("parallel-jobs-progress")).toBeInTheDocument();
    });

    it("renders jobs in tier order (1K, 2K, 4K)", () => {
      const jobs = [
        createJob("TIER_4K", "PENDING"),
        createJob("TIER_1K", "PENDING"),
        createJob("TIER_2K", "PENDING"),
      ];
      render(<ParallelJobsProgress jobs={jobs} />);

      const container = screen.getByTestId("job-cards-container");
      const cards = container.children;

      expect(cards[0]).toHaveAttribute("data-testid", "job-card-TIER_1K");
      expect(cards[1]).toHaveAttribute("data-testid", "job-card-TIER_2K");
      expect(cards[2]).toHaveAttribute("data-testid", "job-card-TIER_4K");
    });

    it("applies custom className", () => {
      const jobs = [createJob("TIER_1K", "PENDING")];
      render(<ParallelJobsProgress jobs={jobs} className="custom-class" />);
      expect(screen.getByTestId("parallel-jobs-progress")).toHaveClass("custom-class");
    });
  });

  describe("Progress Summary", () => {
    it("shows completed count", () => {
      const jobs = [
        createJob("TIER_1K", "COMPLETED", { enhancedUrl: "http://example.com/1.jpg" }),
        createJob("TIER_2K", "PENDING"),
      ];
      render(<ParallelJobsProgress jobs={jobs} />);
      expect(screen.getByTestId("progress-summary")).toHaveTextContent("1/2 completed");
    });

    it("shows failed count when there are failures", () => {
      const jobs = [
        createJob("TIER_1K", "FAILED", { error: "Error" }),
        createJob("TIER_2K", "COMPLETED", { enhancedUrl: "http://example.com/2.jpg" }),
      ];
      render(<ParallelJobsProgress jobs={jobs} />);
      expect(screen.getByTestId("progress-summary")).toHaveTextContent("1 failed");
    });

    it("shows processing count when jobs are processing", () => {
      const jobs = [
        createJob("TIER_1K", "PROCESSING"),
        createJob("TIER_2K", "PENDING"),
      ];
      render(<ParallelJobsProgress jobs={jobs} />);
      expect(screen.getByTestId("progress-summary")).toHaveTextContent("1 processing");
    });

    it("shows combined summary with all states", () => {
      const jobs = [
        createJob("TIER_1K", "COMPLETED", { enhancedUrl: "http://example.com/1.jpg" }),
        createJob("TIER_2K", "FAILED", { error: "Error" }),
        createJob("TIER_4K", "PROCESSING"),
      ];
      render(<ParallelJobsProgress jobs={jobs} />);
      const summary = screen.getByTestId("progress-summary").textContent;
      expect(summary).toContain("1/3 completed");
      expect(summary).toContain("1 failed");
      expect(summary).toContain("1 processing");
    });
  });

  describe("Tier Badges", () => {
    it("renders 1K badge with correct styling", () => {
      const jobs = [createJob("TIER_1K", "PENDING")];
      render(<ParallelJobsProgress jobs={jobs} />);
      const badge = screen.getByTestId("tier-badge-TIER_1K");
      expect(badge).toHaveTextContent("1K");
      expect(badge).toHaveClass("bg-green-500/20");
    });

    it("renders 2K badge with correct styling", () => {
      const jobs = [createJob("TIER_2K", "PENDING")];
      render(<ParallelJobsProgress jobs={jobs} />);
      const badge = screen.getByTestId("tier-badge-TIER_2K");
      expect(badge).toHaveTextContent("2K");
      expect(badge).toHaveClass("bg-cyan-500/20");
    });

    it("renders 4K badge with correct styling", () => {
      const jobs = [createJob("TIER_4K", "PENDING")];
      render(<ParallelJobsProgress jobs={jobs} />);
      const badge = screen.getByTestId("tier-badge-TIER_4K");
      expect(badge).toHaveTextContent("4K");
      expect(badge).toHaveClass("bg-purple-500/20");
    });
  });

  describe("Status Icons", () => {
    it("renders Clock icon for PENDING status", () => {
      const jobs = [createJob("TIER_1K", "PENDING")];
      render(<ParallelJobsProgress jobs={jobs} />);
      expect(screen.getByTestId("status-icon-pending-TIER_1K")).toBeInTheDocument();
    });

    it("renders spinning Loader2 icon for PROCESSING status", () => {
      const jobs = [createJob("TIER_1K", "PROCESSING")];
      render(<ParallelJobsProgress jobs={jobs} />);
      const icon = screen.getByTestId("status-icon-processing-TIER_1K");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass("animate-spin");
    });

    it("renders Check icon for COMPLETED status", () => {
      const jobs = [createJob("TIER_1K", "COMPLETED", { enhancedUrl: "http://example.com/1.jpg" })];
      render(<ParallelJobsProgress jobs={jobs} />);
      expect(screen.getByTestId("status-icon-completed-TIER_1K")).toBeInTheDocument();
    });

    it("renders X icon for FAILED status", () => {
      const jobs = [createJob("TIER_1K", "FAILED", { error: "Error" })];
      render(<ParallelJobsProgress jobs={jobs} />);
      expect(screen.getByTestId("status-icon-failed-TIER_1K")).toBeInTheDocument();
    });

    it("applies tier-specific color to PROCESSING icon", () => {
      const jobs = [
        createJob("TIER_1K", "PROCESSING"),
        createJob("TIER_2K", "PROCESSING"),
        createJob("TIER_4K", "PROCESSING"),
      ];
      render(<ParallelJobsProgress jobs={jobs} />);

      expect(screen.getByTestId("status-icon-processing-TIER_1K")).toHaveClass("text-green-400");
      expect(screen.getByTestId("status-icon-processing-TIER_2K")).toHaveClass("text-cyan-400");
      expect(screen.getByTestId("status-icon-processing-TIER_4K")).toHaveClass("text-purple-400");
    });
  });

  describe("Status Text", () => {
    it("shows 'Queued' text for PENDING status", () => {
      const jobs = [createJob("TIER_1K", "PENDING")];
      render(<ParallelJobsProgress jobs={jobs} />);
      expect(screen.getByTestId("pending-text-TIER_1K")).toHaveTextContent("Queued");
    });

    it("shows 'Processing...' text for PROCESSING status", () => {
      const jobs = [createJob("TIER_1K", "PROCESSING")];
      render(<ParallelJobsProgress jobs={jobs} />);
      expect(screen.getByTestId("processing-text-TIER_1K")).toHaveTextContent("Processing...");
    });
  });

  describe("Completed State", () => {
    it("shows thumbnail in expanded view when completed with enhancedUrl", () => {
      const jobs = [
        createJob("TIER_1K", "COMPLETED", { enhancedUrl: "http://example.com/enhanced.jpg" }),
      ];
      render(<ParallelJobsProgress jobs={jobs} />);
      expect(screen.getByTestId("job-thumbnail-TIER_1K")).toBeInTheDocument();
    });

    it("calls onViewResult when thumbnail is clicked", () => {
      const onViewResult = vi.fn();
      const jobs = [
        createJob("TIER_1K", "COMPLETED", {
          jobId: "test-job-id",
          enhancedUrl: "http://example.com/1.jpg",
        }),
      ];
      render(<ParallelJobsProgress jobs={jobs} onViewResult={onViewResult} />);

      fireEvent.click(screen.getByTestId("job-thumbnail-TIER_1K"));
      expect(onViewResult).toHaveBeenCalledWith("test-job-id");
    });

    it("shows View button in compact view", () => {
      const onViewResult = vi.fn();
      const jobs = [createJob("TIER_1K", "COMPLETED", { enhancedUrl: "http://example.com/1.jpg" })];
      render(<ParallelJobsProgress jobs={jobs} onViewResult={onViewResult} />);

      fireEvent.click(screen.getByTestId("toggle-view-button"));
      expect(screen.getByTestId("view-result-TIER_1K")).toBeInTheDocument();
    });

    it("calls onViewResult when View button is clicked in compact mode", () => {
      const onViewResult = vi.fn();
      const jobs = [
        createJob("TIER_1K", "COMPLETED", {
          jobId: "test-job",
          enhancedUrl: "http://example.com/1.jpg",
        }),
      ];
      render(<ParallelJobsProgress jobs={jobs} onViewResult={onViewResult} />);

      fireEvent.click(screen.getByTestId("toggle-view-button"));
      fireEvent.click(screen.getByTestId("view-result-TIER_1K"));
      expect(onViewResult).toHaveBeenCalledWith("test-job");
    });

    it("does not show View button if onViewResult is not provided", () => {
      const jobs = [createJob("TIER_1K", "COMPLETED", { enhancedUrl: "http://example.com/1.jpg" })];
      render(<ParallelJobsProgress jobs={jobs} />);

      fireEvent.click(screen.getByTestId("toggle-view-button"));
      expect(screen.queryByTestId("view-result-TIER_1K")).not.toBeInTheDocument();
    });
  });

  describe("Failed State", () => {
    it("shows error message when job has failed", () => {
      const jobs = [createJob("TIER_1K", "FAILED", { error: "Enhancement failed due to timeout" })];
      render(<ParallelJobsProgress jobs={jobs} />);
      expect(screen.getByTestId("error-message-TIER_1K")).toHaveTextContent(
        "Enhancement failed due to timeout",
      );
    });

    it("shows retry button when onRetry is provided", () => {
      const onRetry = vi.fn();
      const jobs = [createJob("TIER_1K", "FAILED", { error: "Error" })];
      render(<ParallelJobsProgress jobs={jobs} onRetry={onRetry} />);
      expect(screen.getByTestId("retry-button-TIER_1K")).toBeInTheDocument();
    });

    it("does not show retry button when onRetry is not provided", () => {
      const jobs = [createJob("TIER_1K", "FAILED", { error: "Error" })];
      render(<ParallelJobsProgress jobs={jobs} />);
      expect(screen.queryByTestId("retry-button-TIER_1K")).not.toBeInTheDocument();
    });

    it("calls onRetry with correct tier when retry button is clicked", () => {
      const onRetry = vi.fn();
      const jobs = [createJob("TIER_2K", "FAILED", { error: "Error" })];
      render(<ParallelJobsProgress jobs={jobs} onRetry={onRetry} />);

      fireEvent.click(screen.getByTestId("retry-button-TIER_2K"));
      expect(onRetry).toHaveBeenCalledWith("TIER_2K");
    });

    it("applies destructive border style to failed job card", () => {
      const jobs = [createJob("TIER_1K", "FAILED", { error: "Error" })];
      render(<ParallelJobsProgress jobs={jobs} />);
      expect(screen.getByTestId("job-card-TIER_1K")).toHaveClass("border-destructive/50");
    });

    it("does not show error message if error is undefined", () => {
      const jobs = [createJob("TIER_1K", "FAILED")];
      render(<ParallelJobsProgress jobs={jobs} />);
      expect(screen.queryByTestId("error-message-TIER_1K")).not.toBeInTheDocument();
    });
  });

  describe("Card Styling", () => {
    it("applies green border style to completed job card", () => {
      const jobs = [createJob("TIER_1K", "COMPLETED", { enhancedUrl: "http://example.com/1.jpg" })];
      render(<ParallelJobsProgress jobs={jobs} />);
      expect(screen.getByTestId("job-card-TIER_1K")).toHaveClass("border-green-500/30");
    });

    it("does not apply special border to pending or processing cards", () => {
      const jobs = [
        createJob("TIER_1K", "PENDING"),
        createJob("TIER_2K", "PROCESSING"),
      ];
      render(<ParallelJobsProgress jobs={jobs} />);

      expect(screen.getByTestId("job-card-TIER_1K")).not.toHaveClass("border-destructive/50");
      expect(screen.getByTestId("job-card-TIER_1K")).not.toHaveClass("border-green-500/30");
      expect(screen.getByTestId("job-card-TIER_2K")).not.toHaveClass("border-destructive/50");
      expect(screen.getByTestId("job-card-TIER_2K")).not.toHaveClass("border-green-500/30");
    });
  });

  describe("Expanded/Compact View Toggle", () => {
    it("starts in expanded view by default", () => {
      const jobs = [createJob("TIER_1K", "COMPLETED", { enhancedUrl: "http://example.com/1.jpg" })];
      render(<ParallelJobsProgress jobs={jobs} />);

      expect(screen.getByTestId("toggle-view-button")).toHaveTextContent("Compact");
      expect(screen.getByTestId("job-thumbnail-TIER_1K")).toBeInTheDocument();
    });

    it("toggles to compact view when button is clicked", () => {
      const jobs = [createJob("TIER_1K", "COMPLETED", { enhancedUrl: "http://example.com/1.jpg" })];
      render(<ParallelJobsProgress jobs={jobs} onViewResult={vi.fn()} />);

      fireEvent.click(screen.getByTestId("toggle-view-button"));

      expect(screen.getByTestId("toggle-view-button")).toHaveTextContent("Expanded");
      expect(screen.queryByTestId("job-thumbnail-TIER_1K")).not.toBeInTheDocument();
      expect(screen.getByTestId("view-result-TIER_1K")).toBeInTheDocument();
    });

    it("toggles back to expanded view", () => {
      const jobs = [createJob("TIER_1K", "COMPLETED", { enhancedUrl: "http://example.com/1.jpg" })];
      render(<ParallelJobsProgress jobs={jobs} />);

      fireEvent.click(screen.getByTestId("toggle-view-button"));
      fireEvent.click(screen.getByTestId("toggle-view-button"));

      expect(screen.getByTestId("toggle-view-button")).toHaveTextContent("Compact");
      expect(screen.getByTestId("job-thumbnail-TIER_1K")).toBeInTheDocument();
    });
  });

  describe("Multiple Jobs Integration", () => {
    it("renders all three tier jobs correctly", () => {
      const jobs = [
        createJob("TIER_1K", "COMPLETED", { enhancedUrl: "http://example.com/1.jpg" }),
        createJob("TIER_2K", "PROCESSING"),
        createJob("TIER_4K", "FAILED", { error: "Timeout" }),
      ];
      const onViewResult = vi.fn();
      const onRetry = vi.fn();

      render(<ParallelJobsProgress jobs={jobs} onViewResult={onViewResult} onRetry={onRetry} />);

      expect(screen.getByTestId("job-card-TIER_1K")).toBeInTheDocument();
      expect(screen.getByTestId("job-card-TIER_2K")).toBeInTheDocument();
      expect(screen.getByTestId("job-card-TIER_4K")).toBeInTheDocument();

      expect(screen.getByTestId("status-icon-completed-TIER_1K")).toBeInTheDocument();
      expect(screen.getByTestId("status-icon-processing-TIER_2K")).toBeInTheDocument();
      expect(screen.getByTestId("status-icon-failed-TIER_4K")).toBeInTheDocument();

      expect(screen.getByTestId("job-thumbnail-TIER_1K")).toBeInTheDocument();
      expect(screen.getByTestId("processing-text-TIER_2K")).toBeInTheDocument();
      expect(screen.getByTestId("retry-button-TIER_4K")).toBeInTheDocument();
    });

    it("handles multiple jobs of different states with callbacks", () => {
      const jobs = [
        createJob("TIER_1K", "COMPLETED", {
          jobId: "job-1k",
          enhancedUrl: "http://example.com/1.jpg",
        }),
        createJob("TIER_4K", "FAILED", { error: "Error" }),
      ];
      const onViewResult = vi.fn();
      const onRetry = vi.fn();

      render(<ParallelJobsProgress jobs={jobs} onViewResult={onViewResult} onRetry={onRetry} />);

      fireEvent.click(screen.getByTestId("job-thumbnail-TIER_1K"));
      expect(onViewResult).toHaveBeenCalledWith("job-1k");

      fireEvent.click(screen.getByTestId("retry-button-TIER_4K"));
      expect(onRetry).toHaveBeenCalledWith("TIER_4K");
    });
  });

  describe("Edge Cases", () => {
    it("handles completed job without enhancedUrl in expanded view", () => {
      const jobs = [createJob("TIER_1K", "COMPLETED")];
      render(<ParallelJobsProgress jobs={jobs} />);

      expect(screen.queryByTestId("job-thumbnail-TIER_1K")).not.toBeInTheDocument();
    });

    it("shows View button in compact view even without enhancedUrl when onViewResult provided", () => {
      const onViewResult = vi.fn();
      const jobs = [createJob("TIER_1K", "COMPLETED", { jobId: "test-job" })];
      render(<ParallelJobsProgress jobs={jobs} onViewResult={onViewResult} />);

      fireEvent.click(screen.getByTestId("toggle-view-button"));
      expect(screen.getByTestId("view-result-TIER_1K")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("view-result-TIER_1K"));
      expect(onViewResult).toHaveBeenCalledWith("test-job");
    });

    it("renders job card for all status types without callbacks", () => {
      const jobs = [
        createJob("TIER_1K", "PENDING"),
        createJob("TIER_2K", "PROCESSING"),
        createJob("TIER_4K", "COMPLETED", { enhancedUrl: "http://example.com/4k.jpg" }),
      ];
      render(<ParallelJobsProgress jobs={jobs} />);

      expect(screen.getByTestId("job-card-TIER_1K")).toBeInTheDocument();
      expect(screen.getByTestId("job-card-TIER_2K")).toBeInTheDocument();
      expect(screen.getByTestId("job-card-TIER_4K")).toBeInTheDocument();
    });
  });
});
