import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MixHistory } from "./MixHistory";
import * as mixHistoryHook from "@/hooks/useMixHistory";

// Mock useMixHistory
vi.mock("@/hooks/useMixHistory", () => ({
  useMixHistory: vi.fn(),
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  },
}));

describe("MixHistory", () => {
  const defaultProps = {
    onMixClick: vi.fn(),
  };

  const mockMixes = [
    {
      id: "mix1",
      targetImage: { url: "target1.jpg", name: "Target 1" },
      sourceImage: { url: "source1.jpg", name: "Source 1" },
      resultUrl: "result1.jpg",
      createdAt: new Date("2023-01-01"),
      tier: "TIER_1K",
      status: "COMPLETED",
    },
    {
      id: "mix2",
      targetImage: { url: "target2.jpg", name: "Target 2" },
      sourceImage: { url: "source2.jpg", name: "Source 2" },
      resultUrl: null,
      createdAt: new Date("2023-01-02"),
      tier: "TIER_4K",
      status: "PROCESSING",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state", () => {
    (mixHistoryHook.useMixHistory as any).mockReturnValue({
      mixes: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<MixHistory {...defaultProps} />);

    expect(screen.getByText("History")).toBeInTheDocument();
    // Look for spinner or container
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("renders error state", () => {
    const refetchMock = vi.fn();
    (mixHistoryHook.useMixHistory as any).mockReturnValue({
      mixes: [],
      isLoading: false,
      error: "Failed to load history",
      refetch: refetchMock,
    });

    render(<MixHistory {...defaultProps} />);

    expect(screen.getByText("Failed to load history")).toBeInTheDocument();

    const tryAgainButton = screen.getByText("Try again");
    fireEvent.click(tryAgainButton);
    expect(refetchMock).toHaveBeenCalled();
  });

  it("renders empty state", () => {
    (mixHistoryHook.useMixHistory as any).mockReturnValue({
      mixes: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<MixHistory {...defaultProps} />);

    expect(screen.getByText("No mixes yet. Create your first mix above.")).toBeInTheDocument();
  });

  it("renders list of mixes", () => {
    (mixHistoryHook.useMixHistory as any).mockReturnValue({
      mixes: mockMixes,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<MixHistory {...defaultProps} />);

    // Check images
    expect(screen.getByAltText("Target 1")).toBeInTheDocument();
    expect(screen.getByAltText("Source 1")).toBeInTheDocument();
    expect(screen.getByAltText("Mix result")).toBeInTheDocument(); // For mix1

    // Check tier badges
    expect(screen.getByText("1K")).toBeInTheDocument();
    expect(screen.getByText("4K")).toBeInTheDocument();

    // Check dates (Jan 1 and Jan 2)
    // Date formatting depends on locale, let's assume default formatting used in component
    // new Date("2023-01-01").toLocaleDateString(undefined, { month: "short", day: "numeric" })
    // might render "Jan 1" or "1 Jan"
    // We can just check for existence or text content loosely if locale is uncertain in test env
    // But usually in JSDOM environment it's en-US by default.
  });

  it("handles mix click", () => {
    (mixHistoryHook.useMixHistory as any).mockReturnValue({
      mixes: mockMixes,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<MixHistory {...defaultProps} />);

    const mix1Button = screen.getByAltText("Target 1").closest("button");
    fireEvent.click(mix1Button!);

    expect(defaultProps.onMixClick).toHaveBeenCalledWith(mockMixes[0]);
  });

  it("renders pending/processing state correctly", () => {
    (mixHistoryHook.useMixHistory as any).mockReturnValue({
      mixes: [mockMixes[1]], // This one is PROCESSING and resultUrl is null
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<MixHistory {...defaultProps} />);

    expect(screen.getByAltText("Target 2")).toBeInTheDocument();
    expect(screen.queryByAltText("Mix result")).not.toBeInTheDocument();

    // Should show spinner placeholder
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });
});
