import type { SocialPlatform, StreamFilter } from "@/lib/social/types";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StreamFilters } from "./StreamFilters";

/**
 * Helper function to create a default StreamFilter
 */
function createDefaultFilter(overrides: Partial<StreamFilter> = {}): StreamFilter {
  return {
    sortBy: "publishedAt",
    sortOrder: "desc",
    ...overrides,
  };
}

/**
 * Default connected platforms for testing
 */
const DEFAULT_PLATFORMS: SocialPlatform[] = ["TWITTER", "FACEBOOK", "INSTAGRAM"];

describe("StreamFilters", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Rendering", () => {
    it("should render the filter bar", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );
      expect(screen.getByTestId("stream-filters")).toBeInTheDocument();
    });

    it("should render search input with placeholder", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );
      const searchInput = screen.getByTestId("search-input");
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute("placeholder", "Search posts...");
    });

    it("should render platform filter toggles", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );
      expect(screen.getByTestId("platform-filter")).toBeInTheDocument();
      expect(screen.getByTestId("platform-toggle-twitter")).toBeInTheDocument();
      expect(screen.getByTestId("platform-toggle-facebook")).toBeInTheDocument();
      expect(screen.getByTestId("platform-toggle-instagram")).toBeInTheDocument();
    });

    it("should render sort dropdown", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );
      expect(screen.getByTestId("sort-select")).toBeInTheDocument();
    });

    it("should render refresh button when onRefresh is provided", () => {
      const onChange = vi.fn();
      const onRefresh = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
          onRefresh={onRefresh}
        />,
      );
      expect(screen.getByTestId("refresh-button")).toBeInTheDocument();
    });

    it("should not render refresh button when onRefresh is not provided", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );
      expect(screen.queryByTestId("refresh-button")).not.toBeInTheDocument();
    });

    it("should not render platform filter when no connected platforms", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={[]}
        />,
      );
      expect(screen.queryByTestId("platform-filter")).not.toBeInTheDocument();
    });

    it("should render only connected platforms in toggle group", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={["TWITTER", "LINKEDIN"]}
        />,
      );
      expect(screen.getByTestId("platform-toggle-twitter")).toBeInTheDocument();
      expect(screen.getByTestId("platform-toggle-linkedin")).toBeInTheDocument();
      expect(screen.queryByTestId("platform-toggle-facebook")).not.toBeInTheDocument();
      expect(screen.queryByTestId("platform-toggle-instagram")).not.toBeInTheDocument();
    });

    it("should render TikTok platform toggle when connected", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={["TIKTOK"]}
        />,
      );
      expect(screen.getByTestId("platform-toggle-tiktok")).toBeInTheDocument();
      expect(screen.getByText("TT")).toBeInTheDocument();
    });
  });

  describe("Search Input", () => {
    it("should display initial search query value", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter({ searchQuery: "initial search" })}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );
      expect(screen.getByTestId("search-input")).toHaveValue("initial search");
    });

    it("should trigger onChange after debounce delay", async () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "test query" } });

      // Should not be called immediately
      expect(onChange).not.toHaveBeenCalled();

      // Advance timers by 300ms
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith({
        sortBy: "publishedAt",
        sortOrder: "desc",
        searchQuery: "test query",
      });
    });

    it("should trigger onChange immediately on Enter key", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "instant search" } });
      fireEvent.keyDown(searchInput, { key: "Enter" });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith({
        sortBy: "publishedAt",
        sortOrder: "desc",
        searchQuery: "instant search",
      });
    });

    it("should cancel debounce timer on Enter key", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "test" } });
      fireEvent.keyDown(searchInput, { key: "Enter" });

      // Advance timers - should not trigger again
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("should clear searchQuery when input is empty", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter({ searchQuery: "existing" })}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "" } });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(onChange).toHaveBeenCalledWith({
        sortBy: "publishedAt",
        sortOrder: "desc",
        searchQuery: undefined,
      });
    });

    it("should sync internal state with external filter changes", () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <StreamFilters
          filters={createDefaultFilter({ searchQuery: "initial" })}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      expect(screen.getByTestId("search-input")).toHaveValue("initial");

      rerender(
        <StreamFilters
          filters={createDefaultFilter({ searchQuery: "updated" })}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      expect(screen.getByTestId("search-input")).toHaveValue("updated");
    });

    it("should sync internal state when searchQuery becomes undefined", () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <StreamFilters
          filters={createDefaultFilter({ searchQuery: "initial" })}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      expect(screen.getByTestId("search-input")).toHaveValue("initial");

      rerender(
        <StreamFilters
          filters={createDefaultFilter({ searchQuery: undefined })}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      expect(screen.getByTestId("search-input")).toHaveValue("");
    });

    it("should reset debounce timer on rapid input changes", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      const searchInput = screen.getByTestId("search-input");

      // Type first character
      fireEvent.change(searchInput, { target: { value: "a" } });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Type second character (before debounce completes)
      fireEvent.change(searchInput, { target: { value: "ab" } });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Type third character (before debounce completes)
      fireEvent.change(searchInput, { target: { value: "abc" } });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Should only be called once with final value
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith({
        sortBy: "publishedAt",
        sortOrder: "desc",
        searchQuery: "abc",
      });
    });

    it("should not trigger onChange on non-Enter key press", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "test" } });
      fireEvent.keyDown(searchInput, { key: "Tab" });

      // Should not be called immediately
      expect(onChange).not.toHaveBeenCalled();
    });

    it("should handle Enter key press when no debounce timer is pending", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      const searchInput = screen.getByTestId("search-input");
      // Change the value but wait for debounce to complete first
      fireEvent.change(searchInput, { target: { value: "test" } });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Clear the mock to reset call count
      onChange.mockClear();

      // Now press Enter with no pending debounce timer
      fireEvent.keyDown(searchInput, { key: "Enter" });

      // Should still trigger onChange
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith({
        sortBy: "publishedAt",
        sortOrder: "desc",
        searchQuery: "test",
      });
    });
  });

  describe("Platform Filter", () => {
    it("should call onChange when platform toggle is clicked", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      fireEvent.click(screen.getByTestId("platform-toggle-twitter"));

      expect(onChange).toHaveBeenCalledWith({
        sortBy: "publishedAt",
        sortOrder: "desc",
        platforms: ["TWITTER"],
      });
    });

    it("should allow selecting multiple platforms", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter({ platforms: ["TWITTER"] })}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      fireEvent.click(screen.getByTestId("platform-toggle-facebook"));

      expect(onChange).toHaveBeenCalledWith({
        sortBy: "publishedAt",
        sortOrder: "desc",
        platforms: ["TWITTER", "FACEBOOK"],
      });
    });

    it("should set platforms to undefined when all platforms are selected", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter({ platforms: ["TWITTER", "FACEBOOK"] })}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      fireEvent.click(screen.getByTestId("platform-toggle-instagram"));

      // When all three are selected, should reset to undefined (show all)
      expect(onChange).toHaveBeenCalledWith({
        sortBy: "publishedAt",
        sortOrder: "desc",
        platforms: undefined,
      });
    });

    it("should set platforms to undefined when deselecting last platform", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter({ platforms: ["TWITTER"] })}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      fireEvent.click(screen.getByTestId("platform-toggle-twitter"));

      // When none are selected, should reset to undefined (show all)
      expect(onChange).toHaveBeenCalledWith({
        sortBy: "publishedAt",
        sortOrder: "desc",
        platforms: undefined,
      });
    });

    it("should display correct platform short names", () => {
      const onChange = vi.fn();
      const allPlatforms: SocialPlatform[] = [
        "TWITTER",
        "FACEBOOK",
        "INSTAGRAM",
        "LINKEDIN",
        "TIKTOK",
        "YOUTUBE",
      ];
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={allPlatforms}
        />,
      );

      expect(screen.getByText("X")).toBeInTheDocument();
      expect(screen.getByText("FB")).toBeInTheDocument();
      expect(screen.getByText("IG")).toBeInTheDocument();
      expect(screen.getByText("LI")).toBeInTheDocument();
      expect(screen.getByText("TT")).toBeInTheDocument();
      expect(screen.getByText("YT")).toBeInTheDocument();
    });

    it("should have correct aria-labels on platform toggles", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      expect(screen.getByTestId("platform-toggle-twitter")).toHaveAttribute(
        "aria-label",
        "Filter by Twitter",
      );
      expect(screen.getByTestId("platform-toggle-facebook")).toHaveAttribute(
        "aria-label",
        "Filter by Facebook",
      );
      expect(screen.getByTestId("platform-toggle-instagram")).toHaveAttribute(
        "aria-label",
        "Filter by Instagram",
      );
    });
  });

  describe("Sort Dropdown", () => {
    it("should display correct initial sort value for newest first", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter({ sortBy: "publishedAt", sortOrder: "desc" })}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      expect(screen.getByTestId("sort-select")).toHaveTextContent("Newest first");
    });

    it("should display correct initial sort value for oldest first", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter({ sortBy: "publishedAt", sortOrder: "asc" })}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      expect(screen.getByTestId("sort-select")).toHaveTextContent("Oldest first");
    });

    it("should display correct initial sort value for most liked", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter({ sortBy: "likes", sortOrder: "desc" })}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      expect(screen.getByTestId("sort-select")).toHaveTextContent("Most liked");
    });

    it("should display correct initial sort value for most comments", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter({ sortBy: "comments", sortOrder: "desc" })}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      expect(screen.getByTestId("sort-select")).toHaveTextContent("Most comments");
    });

    it("should display correct initial sort value for highest engagement", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter({ sortBy: "engagementRate", sortOrder: "desc" })}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      expect(screen.getByTestId("sort-select")).toHaveTextContent("Highest engagement");
    });

    it("should call onChange when sort option is selected", () => {
      // Use real timers for Select component interaction
      vi.useRealTimers();
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      // Open the select dropdown
      fireEvent.click(screen.getByTestId("sort-select"));

      // Select the option
      fireEvent.click(screen.getByTestId("sort-option-most-liked"));

      expect(onChange).toHaveBeenCalledWith({
        sortBy: "likes",
        sortOrder: "desc",
      });
      vi.useFakeTimers();
    });

    it("should call onChange when selecting oldest first", () => {
      vi.useRealTimers();
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      fireEvent.click(screen.getByTestId("sort-select"));
      fireEvent.click(screen.getByTestId("sort-option-oldest"));

      expect(onChange).toHaveBeenCalledWith({
        sortBy: "publishedAt",
        sortOrder: "asc",
      });
      vi.useFakeTimers();
    });

    it("should call onChange when selecting most comments", () => {
      vi.useRealTimers();
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      fireEvent.click(screen.getByTestId("sort-select"));
      fireEvent.click(screen.getByTestId("sort-option-most-comments"));

      expect(onChange).toHaveBeenCalledWith({
        sortBy: "comments",
        sortOrder: "desc",
      });
      vi.useFakeTimers();
    });

    it("should call onChange when selecting highest engagement", () => {
      vi.useRealTimers();
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      fireEvent.click(screen.getByTestId("sort-select"));
      fireEvent.click(screen.getByTestId("sort-option-highest-engagement"));

      expect(onChange).toHaveBeenCalledWith({
        sortBy: "engagementRate",
        sortOrder: "desc",
      });
      vi.useFakeTimers();
    });

    it("should default to newest when sortBy/sortOrder combination is unknown", () => {
      const onChange = vi.fn();
      // This tests the fallback case in getSortValue
      render(
        <StreamFilters
          filters={{
            sortBy: "likes",
            sortOrder: "asc", // This combination doesn't exist in SORT_OPTIONS
          }}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      // Should show "Newest first" as fallback
      expect(screen.getByTestId("sort-select")).toHaveTextContent("Newest first");
    });
  });

  describe("Refresh Button", () => {
    it("should call onRefresh when clicked", () => {
      const onChange = vi.fn();
      const onRefresh = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
          onRefresh={onRefresh}
        />,
      );

      fireEvent.click(screen.getByTestId("refresh-button"));

      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it("should be disabled when isLoading is true", () => {
      const onChange = vi.fn();
      const onRefresh = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
          onRefresh={onRefresh}
          isLoading={true}
        />,
      );

      const refreshButton = screen.getByTestId("refresh-button");
      expect(refreshButton).toBeDisabled();
    });

    it("should show spinning animation when isLoading is true", () => {
      const onChange = vi.fn();
      const onRefresh = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
          onRefresh={onRefresh}
          isLoading={true}
        />,
      );

      const refreshButton = screen.getByTestId("refresh-button");
      const icon = refreshButton.querySelector("svg");
      expect(icon).toHaveClass("animate-spin");
    });

    it("should not show spinning animation when isLoading is false", () => {
      const onChange = vi.fn();
      const onRefresh = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
          onRefresh={onRefresh}
          isLoading={false}
        />,
      );

      const refreshButton = screen.getByTestId("refresh-button");
      const icon = refreshButton.querySelector("svg");
      expect(icon).not.toHaveClass("animate-spin");
    });

    it("should have correct aria-label", () => {
      const onChange = vi.fn();
      const onRefresh = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
          onRefresh={onRefresh}
        />,
      );

      expect(screen.getByTestId("refresh-button")).toHaveAttribute(
        "aria-label",
        "Refresh posts",
      );
    });
  });

  describe("Combined Filter Changes", () => {
    it("should preserve existing filters when changing search", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter({
            platforms: ["TWITTER"],
            sortBy: "likes",
            sortOrder: "desc",
          })}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "new search" } });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(onChange).toHaveBeenCalledWith({
        platforms: ["TWITTER"],
        sortBy: "likes",
        sortOrder: "desc",
        searchQuery: "new search",
      });
    });

    it("should preserve existing filters when changing platforms", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter({
            searchQuery: "existing search",
            sortBy: "comments",
            sortOrder: "desc",
          })}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      fireEvent.click(screen.getByTestId("platform-toggle-facebook"));

      expect(onChange).toHaveBeenCalledWith({
        searchQuery: "existing search",
        sortBy: "comments",
        sortOrder: "desc",
        platforms: ["FACEBOOK"],
      });
    });

    it("should preserve existing filters when changing sort", () => {
      vi.useRealTimers();
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter({
            searchQuery: "existing search",
            platforms: ["INSTAGRAM"],
          })}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      fireEvent.click(screen.getByTestId("sort-select"));
      fireEvent.click(screen.getByTestId("sort-option-most-liked"));

      expect(onChange).toHaveBeenCalledWith({
        searchQuery: "existing search",
        platforms: ["INSTAGRAM"],
        sortBy: "likes",
        sortOrder: "desc",
      });
      vi.useFakeTimers();
    });
  });

  describe("Accessibility", () => {
    it("should have accessible search input", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      const searchInput = screen.getByTestId("search-input");
      expect(searchInput).toHaveAttribute("aria-label", "Search posts");
    });

    it("should have accessible platform filter", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      const platformFilter = screen.getByTestId("platform-filter");
      expect(platformFilter).toHaveAttribute("aria-label", "Filter by platform");
    });

    it("should have accessible sort select", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      const sortSelect = screen.getByTestId("sort-select");
      expect(sortSelect).toHaveAttribute("aria-label", "Sort posts");
    });
  });

  describe("Edge Cases", () => {
    it("should handle filter with dateRange property", () => {
      const onChange = vi.fn();
      const filters = createDefaultFilter({
        dateRange: {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        },
      });

      render(
        <StreamFilters
          filters={filters}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
        />,
      );

      // Component should render without issues
      expect(screen.getByTestId("stream-filters")).toBeInTheDocument();

      // Changes should preserve dateRange
      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "test" } });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          dateRange: {
            start: new Date("2024-01-01"),
            end: new Date("2024-01-31"),
          },
        }),
      );
    });

    it("should handle single connected platform", () => {
      const onChange = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={["LINKEDIN"]}
        />,
      );

      expect(screen.getByTestId("platform-filter")).toBeInTheDocument();
      expect(screen.getByTestId("platform-toggle-linkedin")).toBeInTheDocument();
      expect(screen.getByText("LI")).toBeInTheDocument();
    });

    it("should handle isLoading default to false", () => {
      const onChange = vi.fn();
      const onRefresh = vi.fn();
      render(
        <StreamFilters
          filters={createDefaultFilter()}
          onChange={onChange}
          connectedPlatforms={DEFAULT_PLATFORMS}
          onRefresh={onRefresh}
        />,
      );

      const refreshButton = screen.getByTestId("refresh-button");
      expect(refreshButton).not.toBeDisabled();
    });
  });
});
