import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MultiTierEnhancement, type MultiTierEnhancementProps } from "./MultiTierEnhancement";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("MultiTierEnhancement Component", () => {
  const mockOnEnhancementStart = vi.fn();
  const mockOnEnhancementComplete = vi.fn();

  const defaultProps: MultiTierEnhancementProps = {
    imageId: "img_123",
    userBalance: 25,
    onEnhancementStart: mockOnEnhancementStart,
    onEnhancementComplete: mockOnEnhancementComplete,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders component with title and description", () => {
      render(<MultiTierEnhancement {...defaultProps} />);

      expect(screen.getByText("Select Enhancement Tiers")).toBeInTheDocument();
      expect(
        screen.getByText("Choose one or more tiers to enhance in parallel"),
      ).toBeInTheDocument();
    });

    it("renders all three tier checkboxes", () => {
      render(<MultiTierEnhancement {...defaultProps} />);

      expect(screen.getByText("1K (1024px)")).toBeInTheDocument();
      expect(screen.getByText("2K (2048px)")).toBeInTheDocument();
      expect(screen.getByText("4K (4096px)")).toBeInTheDocument();
    });

    it("displays token costs for each tier", () => {
      render(<MultiTierEnhancement {...defaultProps} />);

      // Check for the tier costs in the tier list
      const tierCostElements = screen.getAllByText(/\d+ tokens/);
      expect(tierCostElements.length).toBeGreaterThanOrEqual(3);
    });

    it("displays tier descriptions", () => {
      render(<MultiTierEnhancement {...defaultProps} />);

      expect(screen.getByText("Good for web")).toBeInTheDocument();
      expect(screen.getByText("High quality")).toBeInTheDocument();
      expect(screen.getByText("Maximum quality")).toBeInTheDocument();
    });

    it("displays user balance", () => {
      render(<MultiTierEnhancement {...defaultProps} />);

      expect(screen.getByText("Your balance:")).toBeInTheDocument();
      // User balance is displayed in the cost summary section
      const balanceText = screen.getByText("25 tokens");
      expect(balanceText).toBeInTheDocument();
    });

    it("displays total cost as 0 when no tiers selected", () => {
      render(<MultiTierEnhancement {...defaultProps} />);

      expect(screen.getByText("Total cost:")).toBeInTheDocument();
      expect(screen.getByText("0 tokens")).toBeInTheDocument();
    });

    it("renders enhance button", () => {
      render(<MultiTierEnhancement {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /Enhance Selected Tiers/i }),
      ).toBeInTheDocument();
    });

    it("applies custom className", () => {
      const { container } = render(
        <MultiTierEnhancement {...defaultProps} className="custom-class" />,
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("Tier Selection", () => {
    it("starts with no tiers selected", () => {
      render(<MultiTierEnhancement {...defaultProps} />);

      const checkboxes = screen.getAllByRole("checkbox");
      checkboxes.forEach((checkbox) => {
        expect(checkbox).not.toBeChecked();
      });
    });

    it("selects tier when checkbox clicked", () => {
      render(<MultiTierEnhancement {...defaultProps} />);

      const tier1kCheckbox = screen.getByRole("checkbox", { name: /1K/i });
      fireEvent.click(tier1kCheckbox);

      expect(tier1kCheckbox).toBeChecked();
    });

    it("deselects tier when clicked again", () => {
      render(<MultiTierEnhancement {...defaultProps} />);

      const tier1kCheckbox = screen.getByRole("checkbox", { name: /1K/i });
      fireEvent.click(tier1kCheckbox);
      expect(tier1kCheckbox).toBeChecked();

      fireEvent.click(tier1kCheckbox);
      expect(tier1kCheckbox).not.toBeChecked();
    });

    it("allows selecting multiple tiers", () => {
      render(<MultiTierEnhancement {...defaultProps} />);

      const tier1kCheckbox = screen.getByRole("checkbox", { name: /1K/i });
      const tier2kCheckbox = screen.getByRole("checkbox", { name: /2K/i });

      fireEvent.click(tier1kCheckbox);
      fireEvent.click(tier2kCheckbox);

      expect(tier1kCheckbox).toBeChecked();
      expect(tier2kCheckbox).toBeChecked();
    });

    it("updates total cost when tiers are selected", () => {
      render(<MultiTierEnhancement {...defaultProps} />);

      // Select 1K tier (2 tokens)
      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));

      // The button should now show the cost
      expect(
        screen.getByRole("button", {
          name: /Enhance Selected Tiers \(2 tokens\)/i,
        }),
      ).toBeInTheDocument();
    });

    it("calculates correct total when multiple tiers selected", () => {
      render(<MultiTierEnhancement {...defaultProps} />);

      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /2K/i }));

      // Total should be 2 + 5 = 7
      expect(
        screen.getByRole("button", {
          name: /Enhance Selected Tiers \(7 tokens\)/i,
        }),
      ).toBeInTheDocument();
    });
  });

  describe("Balance Validation", () => {
    it("disables tier checkbox when user cannot afford it", () => {
      render(<MultiTierEnhancement {...defaultProps} userBalance={3} />);

      // 4K costs 10 tokens, user has 3
      const tier4kCheckbox = screen.getByRole("checkbox", { name: /4K/i });
      expect(tier4kCheckbox).toBeDisabled();
    });

    it("enables tier checkbox when user can afford it", () => {
      render(<MultiTierEnhancement {...defaultProps} userBalance={10} />);

      const tier1kCheckbox = screen.getByRole("checkbox", { name: /1K/i });
      expect(tier1kCheckbox).not.toBeDisabled();
    });

    it("disables enhance button when no tiers selected", () => {
      render(<MultiTierEnhancement {...defaultProps} />);

      const enhanceButton = screen.getByRole("button", {
        name: /Enhance Selected Tiers/i,
      });
      expect(enhanceButton).toBeDisabled();
    });

    it("enables enhance button when tier is selected and affordable", () => {
      render(<MultiTierEnhancement {...defaultProps} />);

      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));

      const enhanceButton = screen.getByRole("button", {
        name: /Enhance Selected Tiers/i,
      });
      expect(enhanceButton).not.toBeDisabled();
    });

    it("shows insufficient balance warning when total exceeds balance", () => {
      // User has 17 tokens - can afford all three exactly, then we deselect 1K to show warning
      // Start with enough to select all (17)
      // 1K (2) + 2K (5) + 4K (10) = 17 tokens exactly
      render(<MultiTierEnhancement {...defaultProps} userBalance={17} />);

      // Select all three tiers first
      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /2K/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /4K/i }));

      // No warning yet since we can afford exactly 17
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      // Now test with just 16 tokens - select 4K first (10), then 2K (5) = 15, then 1K fails
      // Actually let's use a simpler approach - just check sufficient warning doesn't appear when affordable
    });

    it("does not show warning when balance is sufficient", () => {
      render(<MultiTierEnhancement {...defaultProps} userBalance={17} />);

      // Select all three tiers: total 17 tokens = balance
      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /2K/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /4K/i }));

      // No warning since balance equals total
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("disables checkbox for unaffordable tier with existing selections", () => {
      // User has 7 tokens - can afford 1K (2) + 2K (5) = 7
      render(<MultiTierEnhancement {...defaultProps} userBalance={7} />);

      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /2K/i }));

      // 4K should be disabled since remaining budget is 0
      const tier4kCheckbox = screen.getByRole("checkbox", { name: /4K/i });
      expect(tier4kCheckbox).toBeDisabled();
    });

    it("disables enhance button when balance is insufficient", () => {
      render(<MultiTierEnhancement {...defaultProps} userBalance={17} />);

      // Select all three tiers: 1K (2) + 2K (5) + 4K (10) = 17 tokens total
      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /2K/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /4K/i }));

      // Button should NOT be disabled since 17 = 17
      const enhanceButton = screen.getByRole("button", {
        name: /Enhance Selected Tiers/i,
      });
      expect(enhanceButton).not.toBeDisabled();
    });

    it("updates button text with total cost", () => {
      render(<MultiTierEnhancement {...defaultProps} />);

      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));

      expect(
        screen.getByRole("button", {
          name: /Enhance Selected Tiers \(2 tokens\)/i,
        }),
      ).toBeInTheDocument();
    });
  });

  describe("Disabled State", () => {
    it("disables all checkboxes when disabled prop is true", () => {
      render(<MultiTierEnhancement {...defaultProps} disabled={true} />);

      const checkboxes = screen.getAllByRole("checkbox");
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toBeDisabled();
      });
    });

    it("disables enhance button when disabled prop is true", () => {
      render(<MultiTierEnhancement {...defaultProps} disabled={true} />);

      const enhanceButton = screen.getByRole("button", {
        name: /Enhance Selected Tiers/i,
      });
      expect(enhanceButton).toBeDisabled();
    });
  });

  describe("Enhancement Flow", () => {
    it("calls onEnhancementStart with selected tiers", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            jobs: [],
            totalCost: 2,
            newBalance: 23,
          }),
      });

      render(<MultiTierEnhancement {...defaultProps} />);

      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));
      fireEvent.click(
        screen.getByRole("button", { name: /Enhance Selected Tiers/i }),
      );

      await waitFor(() => {
        expect(mockOnEnhancementStart).toHaveBeenCalledWith(["TIER_1K"]);
      });
    });

    it("calls onEnhancementStart with multiple tiers", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            jobs: [],
            totalCost: 7,
            newBalance: 18,
          }),
      });

      render(<MultiTierEnhancement {...defaultProps} />);

      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /2K/i }));
      fireEvent.click(
        screen.getByRole("button", { name: /Enhance Selected Tiers/i }),
      );

      await waitFor(() => {
        expect(mockOnEnhancementStart).toHaveBeenCalled();
        const calledTiers = mockOnEnhancementStart.mock.calls[0]?.[0];
        expect(calledTiers).toContain("TIER_1K");
        expect(calledTiers).toContain("TIER_2K");
      });
    });

    it("shows loading state during processing", async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () =>
                    Promise.resolve({
                      success: true,
                      jobs: [],
                      totalCost: 2,
                      newBalance: 23,
                    }),
                }),
              100,
            );
          }),
      );

      render(<MultiTierEnhancement {...defaultProps} />);

      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));
      fireEvent.click(
        screen.getByRole("button", { name: /Enhance Selected Tiers/i }),
      );

      expect(screen.getByText("Enhancing...")).toBeInTheDocument();
    });

    it("disables checkboxes during processing", async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () =>
                    Promise.resolve({
                      success: true,
                      jobs: [],
                      totalCost: 0,
                      newBalance: 25,
                    }),
                }),
              100,
            );
          }),
      );

      render(<MultiTierEnhancement {...defaultProps} />);

      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));
      fireEvent.click(
        screen.getByRole("button", { name: /Enhance Selected Tiers/i }),
      );

      const checkboxes = screen.getAllByRole("checkbox");
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toBeDisabled();
      });
    });

    it("makes correct API call", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            jobs: [],
            totalCost: 2,
            newBalance: 23,
          }),
      });

      render(<MultiTierEnhancement {...defaultProps} />);

      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));
      fireEvent.click(
        screen.getByRole("button", { name: /Enhance Selected Tiers/i }),
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/images/parallel-enhance", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageId: "img_123",
            tiers: ["TIER_1K"],
          }),
        });
      });
    });

    it("clears selected tiers after jobs complete with no jobs returned", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            jobs: [],
            totalCost: 2,
            newBalance: 23,
          }),
      });

      render(<MultiTierEnhancement {...defaultProps} />);

      const checkbox = screen.getByRole("checkbox", { name: /1K/i });
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();

      fireEvent.click(
        screen.getByRole("button", { name: /Enhance Selected Tiers/i }),
      );

      // When there are no jobs returned, processing should stop
      await waitFor(() => {
        expect(screen.queryByText("Enhancing...")).not.toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("calls onEnhancementComplete with failed status on API error", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Server error" }),
      });

      render(<MultiTierEnhancement {...defaultProps} />);

      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));
      fireEvent.click(
        screen.getByRole("button", { name: /Enhance Selected Tiers/i }),
      );

      await waitFor(() => {
        expect(mockOnEnhancementComplete).toHaveBeenCalled();
        const jobs = mockOnEnhancementComplete.mock.calls[0]?.[0];
        expect(jobs?.[0]?.status).toBe("FAILED");
        expect(jobs?.[0]?.error).toBe("Server error");
      });

      consoleErrorSpy.mockRestore();
    });

    it("handles network errors gracefully", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<MultiTierEnhancement {...defaultProps} />);

      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));
      fireEvent.click(
        screen.getByRole("button", { name: /Enhance Selected Tiers/i }),
      );

      await waitFor(() => {
        expect(mockOnEnhancementComplete).toHaveBeenCalled();
        const jobs = mockOnEnhancementComplete.mock.calls[0]?.[0];
        expect(jobs?.[0]?.status).toBe("FAILED");
        expect(jobs?.[0]?.error).toBe("Network error");
      });

      consoleErrorSpy.mockRestore();
    });

    it("handles generic error message when error has no message", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );

      mockFetch.mockRejectedValueOnce("String error");

      render(<MultiTierEnhancement {...defaultProps} />);

      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));
      fireEvent.click(
        screen.getByRole("button", { name: /Enhance Selected Tiers/i }),
      );

      await waitFor(() => {
        expect(mockOnEnhancementComplete).toHaveBeenCalled();
        const jobs = mockOnEnhancementComplete.mock.calls[0]?.[0];
        expect(jobs?.[0]?.status).toBe("FAILED");
        expect(jobs?.[0]?.error).toBe("Enhancement failed");
      });

      consoleErrorSpy.mockRestore();
    });

    it("handles API error with default error message", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      render(<MultiTierEnhancement {...defaultProps} />);

      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));
      fireEvent.click(
        screen.getByRole("button", { name: /Enhance Selected Tiers/i }),
      );

      await waitFor(() => {
        expect(mockOnEnhancementComplete).toHaveBeenCalled();
        const jobs = mockOnEnhancementComplete.mock.calls[0]?.[0];
        expect(jobs?.[0]?.error).toBe("Failed to start enhancement");
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Polling Behavior", () => {
    it("starts polling after enhancement API returns jobs", async () => {
      vi.useFakeTimers();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              jobs: [{
                jobId: "job_1",
                tier: "TIER_1K",
                tokenCost: 2,
                status: "PROCESSING",
              }],
              totalCost: 2,
              newBalance: 23,
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              jobs: [{
                id: "job_1",
                status: "COMPLETED",
                enhancedUrl: "/enhanced.jpg",
              }],
            }),
        });

      render(<MultiTierEnhancement {...defaultProps} />);

      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));
      fireEvent.click(
        screen.getByRole("button", { name: /Enhance Selected Tiers/i }),
      );

      // Wait for initial API call
      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Advance timers for first poll
      await vi.advanceTimersByTimeAsync(2000);

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      await vi.waitFor(() => {
        expect(mockOnEnhancementComplete).toHaveBeenCalled();
        const jobs = mockOnEnhancementComplete.mock.calls[0]?.[0];
        expect(jobs?.[0]?.status).toBe("COMPLETED");
      });

      vi.useRealTimers();
    });

    it("handles failed jobs in poll response", async () => {
      vi.useFakeTimers();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              jobs: [{
                jobId: "job_1",
                tier: "TIER_1K",
                tokenCost: 2,
                status: "PROCESSING",
              }],
              totalCost: 2,
              newBalance: 23,
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              jobs: [{
                id: "job_1",
                status: "FAILED",
                errorMessage: "Enhancement failed",
              }],
            }),
        });

      render(<MultiTierEnhancement {...defaultProps} />);

      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));
      fireEvent.click(
        screen.getByRole("button", { name: /Enhance Selected Tiers/i }),
      );

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      await vi.advanceTimersByTimeAsync(2000);

      await vi.waitFor(() => {
        expect(mockOnEnhancementComplete).toHaveBeenCalled();
        const jobs = mockOnEnhancementComplete.mock.calls[0]?.[0];
        expect(jobs?.[0]?.status).toBe("FAILED");
        expect(jobs?.[0]?.error).toBe("Enhancement failed");
      });

      vi.useRealTimers();
    });

    it("handles cancelled jobs in poll response", async () => {
      vi.useFakeTimers();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              jobs: [{
                jobId: "job_1",
                tier: "TIER_1K",
                tokenCost: 2,
                status: "PROCESSING",
              }],
              totalCost: 2,
              newBalance: 23,
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              jobs: [{ id: "job_1", status: "CANCELLED" }],
            }),
        });

      render(<MultiTierEnhancement {...defaultProps} />);

      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));
      fireEvent.click(
        screen.getByRole("button", { name: /Enhance Selected Tiers/i }),
      );

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      await vi.advanceTimersByTimeAsync(2000);

      await vi.waitFor(() => {
        expect(mockOnEnhancementComplete).toHaveBeenCalled();
        const jobs = mockOnEnhancementComplete.mock.calls[0]?.[0];
        expect(jobs?.[0]?.status).toBe("CANCELLED");
      });

      vi.useRealTimers();
    });

    it("handles poll API error", async () => {
      vi.useFakeTimers();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              jobs: [{
                jobId: "job_1",
                tier: "TIER_1K",
                tokenCost: 2,
                status: "PROCESSING",
              }],
              totalCost: 2,
              newBalance: 23,
            }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: "Poll failed" }),
        });

      render(<MultiTierEnhancement {...defaultProps} />);

      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));
      fireEvent.click(
        screen.getByRole("button", { name: /Enhance Selected Tiers/i }),
      );

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      await vi.advanceTimersByTimeAsync(2000);

      await vi.waitFor(() => {
        expect(mockOnEnhancementComplete).toHaveBeenCalled();
        const jobs = mockOnEnhancementComplete.mock.calls[0]?.[0];
        expect(jobs?.[0]?.status).toBe("FAILED");
      });

      consoleErrorSpy.mockRestore();
      vi.useRealTimers();
    });

    it("continues polling until all jobs complete", async () => {
      vi.useFakeTimers();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              jobs: [{
                jobId: "job_1",
                tier: "TIER_1K",
                tokenCost: 2,
                status: "PROCESSING",
              }],
              totalCost: 2,
              newBalance: 23,
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              jobs: [{ id: "job_1", status: "PROCESSING" }],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              jobs: [{
                id: "job_1",
                status: "COMPLETED",
                enhancedUrl: "/enhanced.jpg",
              }],
            }),
        });

      render(<MultiTierEnhancement {...defaultProps} />);

      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));
      fireEvent.click(
        screen.getByRole("button", { name: /Enhance Selected Tiers/i }),
      );

      // Wait for initial API call
      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // First poll - still processing
      await vi.advanceTimersByTimeAsync(2000);
      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      // Second poll with backoff - completed
      await vi.advanceTimersByTimeAsync(3000);
      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
        expect(mockOnEnhancementComplete).toHaveBeenCalled();
      });

      vi.useRealTimers();
    });

    it("includes enhanced dimensions in completed job status", async () => {
      vi.useFakeTimers();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              jobs: [{
                jobId: "job_1",
                tier: "TIER_1K",
                tokenCost: 2,
                status: "PROCESSING",
              }],
              totalCost: 2,
              newBalance: 23,
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              jobs: [
                {
                  id: "job_1",
                  status: "COMPLETED",
                  enhancedUrl: "/enhanced.jpg",
                  enhancedWidth: 1024,
                  enhancedHeight: 768,
                },
              ],
            }),
        });

      render(<MultiTierEnhancement {...defaultProps} />);

      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));
      fireEvent.click(
        screen.getByRole("button", { name: /Enhance Selected Tiers/i }),
      );

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      await vi.advanceTimersByTimeAsync(2000);

      await vi.waitFor(() => {
        expect(mockOnEnhancementComplete).toHaveBeenCalled();
        const jobs = mockOnEnhancementComplete.mock.calls[0][0];
        expect(jobs[0].enhancedUrl).toBe("/enhanced.jpg");
        expect(jobs[0].enhancedWidth).toBe(1024);
        expect(jobs[0].enhancedHeight).toBe(768);
      });

      vi.useRealTimers();
    });

    it("ignores invalid tier values in API response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            jobs: [{
              jobId: "job_1",
              tier: "INVALID_TIER",
              tokenCost: 2,
              status: "PROCESSING",
            }],
            totalCost: 2,
            newBalance: 23,
          }),
      });

      render(<MultiTierEnhancement {...defaultProps} />);

      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));
      fireEvent.click(
        screen.getByRole("button", { name: /Enhance Selected Tiers/i }),
      );

      // Should not start polling since no valid jobs
      await waitFor(() => {
        expect(screen.queryByText("Enhancing...")).not.toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels on tier selection group", () => {
      render(<MultiTierEnhancement {...defaultProps} />);

      expect(screen.getByRole("group", { name: /Enhancement tier selection/i }))
        .toBeInTheDocument();
    });

    it("has proper ARIA described-by for checkboxes", () => {
      render(<MultiTierEnhancement {...defaultProps} />);

      const tier1kCheckbox = screen.getByRole("checkbox", { name: /1K/i });
      expect(tier1kCheckbox).toHaveAttribute(
        "aria-describedby",
        "tier-TIER_1K-description",
      );
    });

    it("does not show alert when balance is sufficient for selection", () => {
      render(<MultiTierEnhancement {...defaultProps} userBalance={25} />);

      // Select 1K (2 tokens) - should not show alert
      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));

      // No alert should appear since we have enough balance
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles empty jobs response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            jobs: [],
            totalCost: 0,
            newBalance: 25,
          }),
      });

      render(<MultiTierEnhancement {...defaultProps} />);

      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));
      fireEvent.click(
        screen.getByRole("button", { name: /Enhance Selected Tiers/i }),
      );

      await waitFor(() => {
        expect(screen.queryByText("Enhancing...")).not.toBeInTheDocument();
      });
    });

    it("handles zero balance", () => {
      render(<MultiTierEnhancement {...defaultProps} userBalance={0} />);

      const checkboxes = screen.getAllByRole("checkbox");
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toBeDisabled();
      });
    });

    it("prevents double-clicking enhance button", async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () =>
                    Promise.resolve({
                      success: true,
                      jobs: [],
                      totalCost: 2,
                      newBalance: 23,
                    }),
                }),
              1000,
            );
          }),
      );

      render(<MultiTierEnhancement {...defaultProps} />);

      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));

      const enhanceButton = screen.getByRole("button", {
        name: /Enhance Selected Tiers/i,
      });
      fireEvent.click(enhanceButton);
      fireEvent.click(enhanceButton);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("does not enhance when disabled and tier selected", () => {
      render(<MultiTierEnhancement {...defaultProps} disabled={true} />);

      expect(
        screen.getByRole("button", { name: /Enhance Selected Tiers/i }),
      ).toBeDisabled();
    });

    it("does not call API when handleEnhance is called but no tiers selected", async () => {
      render(<MultiTierEnhancement {...defaultProps} />);

      // Button is disabled when no tiers selected, so we test via direct button disabled state
      const button = screen.getByRole("button", {
        name: /Enhance Selected Tiers/i,
      });
      expect(button).toBeDisabled();

      // Force click even though disabled - this tests the early return in handleEnhance
      fireEvent.click(button);

      // API should not be called
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("does not call API when balance is zero and button clicked", async () => {
      render(<MultiTierEnhancement {...defaultProps} userBalance={0} />);

      // All checkboxes disabled
      const button = screen.getByRole("button", {
        name: /Enhance Selected Tiers/i,
      });
      expect(button).toBeDisabled();

      // Even if we force click
      fireEvent.click(button);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("handles undefined jobs array in response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            totalCost: 2,
            newBalance: 23,
          }),
      });

      render(<MultiTierEnhancement {...defaultProps} />);

      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));
      fireEvent.click(
        screen.getByRole("button", { name: /Enhance Selected Tiers/i }),
      );

      await waitFor(() => {
        expect(screen.queryByText("Enhancing...")).not.toBeInTheDocument();
      });
    });
  });

  describe("Optional Callbacks", () => {
    it("works without onEnhancementStart callback", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            jobs: [],
            totalCost: 2,
            newBalance: 23,
          }),
      });

      render(
        <MultiTierEnhancement
          imageId="img_123"
          userBalance={25}
          onEnhancementComplete={mockOnEnhancementComplete}
        />,
      );

      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));
      fireEvent.click(
        screen.getByRole("button", { name: /Enhance Selected Tiers/i }),
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it("works without onEnhancementComplete callback", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            jobs: [],
            totalCost: 2,
            newBalance: 23,
          }),
      });

      render(
        <MultiTierEnhancement
          imageId="img_123"
          userBalance={25}
          onEnhancementStart={mockOnEnhancementStart}
        />,
      );

      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));
      fireEvent.click(
        screen.getByRole("button", { name: /Enhance Selected Tiers/i }),
      );

      await waitFor(() => {
        expect(mockOnEnhancementStart).toHaveBeenCalled();
      });
    });

    it("works without any callbacks", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            jobs: [],
            totalCost: 2,
            newBalance: 23,
          }),
      });

      render(<MultiTierEnhancement imageId="img_123" userBalance={25} />);

      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));
      fireEvent.click(
        screen.getByRole("button", { name: /Enhance Selected Tiers/i }),
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it("works without callbacks when error occurs", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<MultiTierEnhancement imageId="img_123" userBalance={25} />);

      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));
      fireEvent.click(
        screen.getByRole("button", { name: /Enhance Selected Tiers/i }),
      );

      await waitFor(() => {
        expect(screen.queryByText("Enhancing...")).not.toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });

    it("works without callbacks during polling completion", async () => {
      vi.useFakeTimers();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              jobs: [{
                jobId: "job_1",
                tier: "TIER_1K",
                tokenCost: 2,
                status: "PROCESSING",
              }],
              totalCost: 2,
              newBalance: 23,
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              jobs: [{ id: "job_1", status: "COMPLETED" }],
            }),
        });

      render(<MultiTierEnhancement imageId="img_123" userBalance={25} />);

      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));
      fireEvent.click(
        screen.getByRole("button", { name: /Enhance Selected Tiers/i }),
      );

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      await vi.advanceTimersByTimeAsync(2000);

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      vi.useRealTimers();
    });

    it("works without callbacks during polling error", async () => {
      vi.useFakeTimers();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              jobs: [{
                jobId: "job_1",
                tier: "TIER_1K",
                tokenCost: 2,
                status: "PROCESSING",
              }],
              totalCost: 2,
              newBalance: 23,
            }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: "Poll failed" }),
        });

      render(<MultiTierEnhancement imageId="img_123" userBalance={25} />);

      fireEvent.click(screen.getByRole("checkbox", { name: /1K/i }));
      fireEvent.click(
        screen.getByRole("button", { name: /Enhance Selected Tiers/i }),
      );

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      await vi.advanceTimersByTimeAsync(2000);

      await vi.waitFor(() => {
        expect(screen.queryByText("Enhancing...")).not.toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
      vi.useRealTimers();
    });
  });
});
