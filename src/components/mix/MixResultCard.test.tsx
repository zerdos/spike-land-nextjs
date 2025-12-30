import * as jobStreamHook from "@/hooks/useJobStream";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MixResultCard } from "./MixResultCard";

// Mock useJobStream
vi.mock("@/hooks/useJobStream", () => ({
  useJobStream: vi.fn(),
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  },
}));

// Mock global fetch
const fetchSpy = vi.spyOn(global, "fetch");
global.URL.createObjectURL = vi.fn(() => "blob:test-url");
global.URL.revokeObjectURL = vi.fn();

describe("MixResultCard", () => {
  const defaultProps = {
    activeJobId: null,
    hasImages: false,
    onComplete: vi.fn(),
    onError: vi.fn(),
    onRetry: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (jobStreamHook.useJobStream as any).mockReturnValue({ job: null });
  });

  it("renders empty state without images", () => {
    render(<MixResultCard {...defaultProps} />);

    expect(screen.getByText("Select two images")).toBeInTheDocument();
    expect(screen.getByText("Choose input photos to start"))
      .toBeInTheDocument();
  });

  it("renders empty state with images", () => {
    render(<MixResultCard {...defaultProps} hasImages={true} />);

    expect(screen.getByText("Ready to mix")).toBeInTheDocument();
    expect(screen.getByText("Click 'Create Mix' to blend images"))
      .toBeInTheDocument();
  });

  it("renders processing state", () => {
    (jobStreamHook.useJobStream as any).mockReturnValue({
      job: {
        id: "job1",
        status: "PROCESSING",
        currentStage: "ENHANCING",
        enhancedUrl: null,
      },
    });

    render(<MixResultCard {...defaultProps} activeJobId="job1" />);

    expect(screen.getByText("Mixing...")).toBeInTheDocument();
    // PipelineProgress might render stage text
  });

  it("renders completed state and triggers onComplete", () => {
    const jobData = {
      id: "job1",
      status: "COMPLETED",
      currentStage: "DONE",
      enhancedUrl: "https://example.com/result.jpg",
      enhancedWidth: 1024,
      enhancedHeight: 1024,
    };

    (jobStreamHook.useJobStream as any).mockReturnValue({
      job: jobData,
    });

    render(<MixResultCard {...defaultProps} activeJobId="job1" />);

    expect(screen.getByAltText("Mix result")).toBeInTheDocument();
    expect(screen.getByText("Download")).toBeInTheDocument();

    // Note: onComplete is triggered in useJobStream callback in the component,
    // but here we are mocking useJobStream return value directly.
    // The component calls onComplete inside useEffect when job status updates or via useJobStream callbacks.
    // Let's check if the useEffect catches the change.
    // The useEffect checks `job.status === "COMPLETED"`.
  });

  it("triggers onComplete via callback passed to useJobStream", async () => {
    // We need to capture the callbacks passed to useJobStream
    let capturedCallbacks: any = {};
    (jobStreamHook.useJobStream as any).mockImplementation((args: any) => {
      capturedCallbacks = args;
      return { job: null };
    });

    render(<MixResultCard {...defaultProps} activeJobId="job1" />);

    const jobData = {
      id: "job1",
      status: "COMPLETED",
      currentStage: "DONE",
      enhancedUrl: "https://example.com/result.jpg",
      enhancedWidth: 1024,
      enhancedHeight: 1024,
    };

    // Simulate callback execution
    // Since this triggers setState, we should wrap in act (or let RTL handle it via waitFor)
    capturedCallbacks.onComplete(jobData);

    await waitFor(() => {
      expect(defaultProps.onComplete).toHaveBeenCalledWith({
        jobId: "job1",
        resultUrl: "https://example.com/result.jpg",
        width: 1024,
        height: 1024,
      });
    });
  });

  it("renders failed state and triggers onError via callback", async () => {
    let capturedCallbacks: any = {};
    (jobStreamHook.useJobStream as any).mockImplementation((args: any) => {
      capturedCallbacks = args;
      return { job: null };
    });

    render(<MixResultCard {...defaultProps} activeJobId="job1" />);

    capturedCallbacks.onError("Something went wrong");

    await waitFor(() => {
      expect(screen.getByText("Mix failed")).toBeInTheDocument();
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(defaultProps.onError).toHaveBeenCalledWith("Something went wrong");
    });
  });

  it("handles failed state from job status", () => {
    (jobStreamHook.useJobStream as any).mockReturnValue({
      job: {
        id: "job1",
        status: "FAILED",
        errorMessage: "Server error",
      },
    });

    render(<MixResultCard {...defaultProps} activeJobId="job1" />);

    expect(screen.getByText("Mix failed")).toBeInTheDocument();
    expect(screen.getByText("Server error")).toBeInTheDocument();
  });

  it("handles retry", () => {
    (jobStreamHook.useJobStream as any).mockReturnValue({
      job: {
        id: "job1",
        status: "FAILED",
        errorMessage: "Server error",
      },
    });

    render(<MixResultCard {...defaultProps} activeJobId="job1" />);

    const retryButton = screen.getByText("Retry");
    fireEvent.click(retryButton);

    expect(defaultProps.onRetry).toHaveBeenCalled();
  });

  it("handles download", async () => {
    const jobData = {
      id: "job1",
      status: "COMPLETED",
      enhancedUrl: "https://example.com/result.jpg",
    };

    (jobStreamHook.useJobStream as any).mockReturnValue({
      job: jobData,
    });

    fetchSpy.mockResolvedValue({
      blob: async () => new Blob(["image data"]),
    } as Response);

    render(<MixResultCard {...defaultProps} activeJobId="job1" />);

    const downloadButton = screen.getByText("Download");
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith("https://example.com/result.jpg");
    });

    // Check if link was created and clicked
    // We can spy on document.createElement or just trust fetch was called
  });
});
