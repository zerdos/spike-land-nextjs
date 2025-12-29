/**
 * useImageSearch Hook Tests
 */

import { act, renderHook } from "@testing-library/react-native";

import {
  getSortLabel,
  type ImageFilters,
  type SortOption,
  sortOptionToApiParams,
  useImageSearch,
} from "./useImageSearch";

// ============================================================================
// Test Setup
// ============================================================================

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

// ============================================================================
// Helper Functions Tests
// ============================================================================

describe("sortOptionToApiParams", () => {
  it("converts newest to createdAt desc", () => {
    expect(sortOptionToApiParams("newest")).toEqual({
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  });

  it("converts oldest to createdAt asc", () => {
    expect(sortOptionToApiParams("oldest")).toEqual({
      sortBy: "createdAt",
      sortOrder: "asc",
    });
  });

  it("converts name_asc to name asc", () => {
    expect(sortOptionToApiParams("name_asc")).toEqual({
      sortBy: "name",
      sortOrder: "asc",
    });
  });

  it("converts name_desc to name desc", () => {
    expect(sortOptionToApiParams("name_desc")).toEqual({
      sortBy: "name",
      sortOrder: "desc",
    });
  });

  it("converts size_asc to size asc", () => {
    expect(sortOptionToApiParams("size_asc")).toEqual({
      sortBy: "size",
      sortOrder: "asc",
    });
  });

  it("converts size_desc to size desc", () => {
    expect(sortOptionToApiParams("size_desc")).toEqual({
      sortBy: "size",
      sortOrder: "desc",
    });
  });

  it("returns default for unknown sort option", () => {
    expect(sortOptionToApiParams("unknown" as SortOption)).toEqual({
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  });
});

describe("getSortLabel", () => {
  it("returns label for newest", () => {
    expect(getSortLabel("newest")).toBe("Newest First");
  });

  it("returns label for oldest", () => {
    expect(getSortLabel("oldest")).toBe("Oldest First");
  });

  it("returns label for name_asc", () => {
    expect(getSortLabel("name_asc")).toBe("Name A-Z");
  });

  it("returns label for name_desc", () => {
    expect(getSortLabel("name_desc")).toBe("Name Z-A");
  });

  it("returns label for size_asc", () => {
    expect(getSortLabel("size_asc")).toBe("Size: Small to Large");
  });

  it("returns label for size_desc", () => {
    expect(getSortLabel("size_desc")).toBe("Size: Large to Small");
  });

  it("returns default label for unknown option", () => {
    expect(getSortLabel("unknown" as SortOption)).toBe("Newest First");
  });
});

// ============================================================================
// useImageSearch Hook Tests
// ============================================================================

describe("useImageSearch", () => {
  describe("Initial State", () => {
    it("initializes with default values", () => {
      const { result } = renderHook(() => useImageSearch());

      expect(result.current.query).toBe("");
      expect(result.current.debouncedQuery).toBe("");
      expect(result.current.sortBy).toBe("newest");
      expect(result.current.filters).toEqual({
        albumIds: [],
        dateRange: {
          startDate: null,
          endDate: null,
        },
      });
      expect(result.current.hasActiveFilters).toBe(false);
      expect(result.current.activeFilterCount).toBe(0);
    });

    it("initializes with provided initial query", () => {
      const { result } = renderHook(() => useImageSearch({ initialQuery: "test search" }));

      expect(result.current.query).toBe("test search");
      expect(result.current.debouncedQuery).toBe("test search");
    });

    it("initializes with provided initial filters", () => {
      const initialFilters: Partial<ImageFilters> = {
        albumIds: ["album-1", "album-2"],
        dateRange: {
          startDate: new Date("2024-01-01"),
          endDate: new Date("2024-12-31"),
        },
      };

      const { result } = renderHook(() => useImageSearch({ initialFilters }));

      expect(result.current.filters.albumIds).toEqual(["album-1", "album-2"]);
      expect(result.current.filters.dateRange.startDate).toEqual(
        new Date("2024-01-01"),
      );
      expect(result.current.filters.dateRange.endDate).toEqual(
        new Date("2024-12-31"),
      );
    });

    it("initializes with provided initial sort", () => {
      const { result } = renderHook(() => useImageSearch({ initialSortBy: "name_asc" }));

      expect(result.current.sortBy).toBe("name_asc");
    });
  });

  describe("Query Management", () => {
    it("updates query immediately", () => {
      const { result } = renderHook(() => useImageSearch());

      act(() => {
        result.current.setQuery("new query");
      });

      expect(result.current.query).toBe("new query");
    });

    it("debounces query update to debouncedQuery", () => {
      const { result } = renderHook(() => useImageSearch());

      act(() => {
        result.current.setQuery("debounced");
      });

      // Query updates immediately
      expect(result.current.query).toBe("debounced");
      // Debounced query not yet updated
      expect(result.current.debouncedQuery).toBe("");

      // Advance timer
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current.debouncedQuery).toBe("debounced");
    });

    it("uses custom debounce delay", () => {
      const { result } = renderHook(() => useImageSearch({ debounceMs: 500 }));

      act(() => {
        result.current.setQuery("test");
      });

      act(() => {
        jest.advanceTimersByTime(400);
      });
      expect(result.current.debouncedQuery).toBe("");

      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(result.current.debouncedQuery).toBe("test");
    });

    it("resets debounce timer on rapid input", () => {
      const { result } = renderHook(() => useImageSearch());

      act(() => {
        result.current.setQuery("a");
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      act(() => {
        result.current.setQuery("ab");
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      act(() => {
        result.current.setQuery("abc");
      });

      // Not enough time
      expect(result.current.debouncedQuery).toBe("");

      // Complete debounce
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current.debouncedQuery).toBe("abc");
    });
  });

  describe("Filter Management", () => {
    it("updates filters with partial object", () => {
      const { result } = renderHook(() => useImageSearch());

      act(() => {
        result.current.setFilters({
          albumIds: ["album-1"],
        });
      });

      expect(result.current.filters.albumIds).toEqual(["album-1"]);
      expect(result.current.filters.dateRange).toEqual({
        startDate: null,
        endDate: null,
      });
    });

    it("merges date range updates", () => {
      const { result } = renderHook(() => useImageSearch());

      act(() => {
        result.current.setFilters({
          dateRange: { startDate: new Date("2024-01-01"), endDate: null },
        });
      });

      expect(result.current.filters.dateRange.startDate).toEqual(
        new Date("2024-01-01"),
      );
      expect(result.current.filters.dateRange.endDate).toBeNull();

      act(() => {
        result.current.setFilters({
          dateRange: { startDate: null, endDate: new Date("2024-12-31") },
        });
      });

      // Start date should be preserved from previous state
      expect(result.current.filters.dateRange.startDate).toBeNull();
      expect(result.current.filters.dateRange.endDate).toEqual(
        new Date("2024-12-31"),
      );
    });

    it("resets filters to defaults", () => {
      const { result } = renderHook(() =>
        useImageSearch({
          initialFilters: {
            albumIds: ["album-1"],
            dateRange: {
              startDate: new Date("2024-01-01"),
              endDate: new Date("2024-12-31"),
            },
          },
        })
      );

      act(() => {
        result.current.resetFilters();
      });

      expect(result.current.filters).toEqual({
        albumIds: [],
        dateRange: {
          startDate: null,
          endDate: null,
        },
      });
    });

    it("calculates hasActiveFilters correctly", () => {
      const { result } = renderHook(() => useImageSearch());

      expect(result.current.hasActiveFilters).toBe(false);

      act(() => {
        result.current.setFilters({ albumIds: ["album-1"] });
      });

      expect(result.current.hasActiveFilters).toBe(true);

      act(() => {
        result.current.resetFilters();
      });

      expect(result.current.hasActiveFilters).toBe(false);

      act(() => {
        result.current.setFilters({
          dateRange: { startDate: new Date(), endDate: null },
        });
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it("calculates activeFilterCount correctly", () => {
      const { result } = renderHook(() => useImageSearch());

      expect(result.current.activeFilterCount).toBe(0);

      act(() => {
        result.current.setFilters({ albumIds: ["album-1"] });
      });

      expect(result.current.activeFilterCount).toBe(1);

      act(() => {
        result.current.setFilters({
          dateRange: { startDate: new Date(), endDate: null },
        });
      });

      expect(result.current.activeFilterCount).toBe(2);
    });
  });

  describe("Sort Management", () => {
    it("updates sort option", () => {
      const { result } = renderHook(() => useImageSearch());

      act(() => {
        result.current.setSortBy("oldest");
      });

      expect(result.current.sortBy).toBe("oldest");
    });

    it("allows changing between all sort options", () => {
      const { result } = renderHook(() => useImageSearch());

      const sortOptions: SortOption[] = [
        "newest",
        "oldest",
        "name_asc",
        "name_desc",
        "size_asc",
        "size_desc",
      ];

      for (const option of sortOptions) {
        act(() => {
          result.current.setSortBy(option);
        });
        expect(result.current.sortBy).toBe(option);
      }
    });
  });

  describe("clearAll", () => {
    it("clears query, filters, and sort", () => {
      const { result } = renderHook(() =>
        useImageSearch({
          initialQuery: "test",
          initialFilters: { albumIds: ["album-1"] },
          initialSortBy: "name_asc",
        })
      );

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.query).toBe("");
      expect(result.current.debouncedQuery).toBe("");
      expect(result.current.sortBy).toBe("newest");
      expect(result.current.filters).toEqual({
        albumIds: [],
        dateRange: {
          startDate: null,
          endDate: null,
        },
      });
    });

    it("clears pending debounce timer", () => {
      const { result } = renderHook(() => useImageSearch());

      act(() => {
        result.current.setQuery("pending");
      });

      expect(result.current.query).toBe("pending");
      expect(result.current.debouncedQuery).toBe("");

      act(() => {
        result.current.clearAll();
      });

      // Advance timer
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Debounced query should not update to "pending"
      expect(result.current.debouncedQuery).toBe("");
    });
  });

  describe("getApiParams", () => {
    it("returns empty object for default state", () => {
      const { result } = renderHook(() => useImageSearch());

      const params = result.current.getApiParams();

      expect(params.search).toBeUndefined();
      expect(params.sortBy).toBe("createdAt");
      expect(params.sortOrder).toBe("desc");
      expect(params.albumId).toBeUndefined();
      expect(params.startDate).toBeUndefined();
      expect(params.endDate).toBeUndefined();
    });

    it("includes search query when present", () => {
      const { result } = renderHook(() => useImageSearch({ initialQuery: "search term" }));

      const params = result.current.getApiParams();

      expect(params.search).toBe("search term");
    });

    it("trims whitespace from search query", () => {
      const { result } = renderHook(() => useImageSearch({ initialQuery: "  spaced query  " }));

      const params = result.current.getApiParams();

      expect(params.search).toBe("spaced query");
    });

    it("excludes empty search query", () => {
      const { result } = renderHook(() => useImageSearch({ initialQuery: "   " }));

      const params = result.current.getApiParams();

      expect(params.search).toBeUndefined();
    });

    it("includes sort parameters", () => {
      const { result } = renderHook(() => useImageSearch({ initialSortBy: "name_desc" }));

      const params = result.current.getApiParams();

      expect(params.sortBy).toBe("name");
      expect(params.sortOrder).toBe("desc");
    });

    it("includes album filter (first album only)", () => {
      const { result } = renderHook(() =>
        useImageSearch({
          initialFilters: {
            albumIds: ["album-1", "album-2"],
          },
        })
      );

      const params = result.current.getApiParams();

      expect(params.albumId).toBe("album-1");
    });

    it("includes date range filters", () => {
      const startDate = new Date("2024-06-15T10:30:00Z");
      const endDate = new Date("2024-12-31T23:59:59Z");

      const { result } = renderHook(() =>
        useImageSearch({
          initialFilters: {
            dateRange: { startDate, endDate },
          },
        })
      );

      const params = result.current.getApiParams();

      expect(params.startDate).toBe("2024-06-15");
      expect(params.endDate).toBe("2024-12-31");
    });

    it("excludes null dates", () => {
      const { result } = renderHook(() =>
        useImageSearch({
          initialFilters: {
            dateRange: { startDate: null, endDate: null },
          },
        })
      );

      const params = result.current.getApiParams();

      expect(params.startDate).toBeUndefined();
      expect(params.endDate).toBeUndefined();
    });

    it("uses debounced query for API params", () => {
      const { result } = renderHook(() => useImageSearch());

      act(() => {
        result.current.setQuery("test");
      });

      // Before debounce
      let params = result.current.getApiParams();
      expect(params.search).toBeUndefined();

      // After debounce
      act(() => {
        jest.advanceTimersByTime(300);
      });

      params = result.current.getApiParams();
      expect(params.search).toBe("test");
    });
  });

  describe("onSearchChange Callback", () => {
    it("calls onSearchChange when debounced query changes", () => {
      const mockOnSearchChange = jest.fn();
      const { result } = renderHook(() => useImageSearch({ onSearchChange: mockOnSearchChange }));

      act(() => {
        result.current.setQuery("test");
      });

      // Not called before debounce
      expect(mockOnSearchChange).toHaveBeenCalledTimes(1); // Initial call

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockOnSearchChange).toHaveBeenCalledTimes(2);
      expect(mockOnSearchChange).toHaveBeenLastCalledWith({
        query: "test",
        filters: expect.any(Object),
        sortBy: "newest",
      });
    });

    it("calls onSearchChange when filters change", () => {
      const mockOnSearchChange = jest.fn();
      const { result } = renderHook(() => useImageSearch({ onSearchChange: mockOnSearchChange }));

      mockOnSearchChange.mockClear();

      act(() => {
        result.current.setFilters({ albumIds: ["album-1"] });
      });

      expect(mockOnSearchChange).toHaveBeenCalledWith({
        query: "",
        filters: expect.objectContaining({
          albumIds: ["album-1"],
        }),
        sortBy: "newest",
      });
    });

    it("calls onSearchChange when sort changes", () => {
      const mockOnSearchChange = jest.fn();
      const { result } = renderHook(() => useImageSearch({ onSearchChange: mockOnSearchChange }));

      mockOnSearchChange.mockClear();

      act(() => {
        result.current.setSortBy("oldest");
      });

      expect(mockOnSearchChange).toHaveBeenCalledWith({
        query: "",
        filters: expect.any(Object),
        sortBy: "oldest",
      });
    });
  });

  describe("Cleanup", () => {
    it("cleans up debounce timer on unmount", () => {
      const mockOnSearchChange = jest.fn();
      const { result, unmount } = renderHook(() =>
        useImageSearch({ onSearchChange: mockOnSearchChange })
      );

      act(() => {
        result.current.setQuery("test");
      });

      mockOnSearchChange.mockClear();
      unmount();

      // Advance timer after unmount
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Callback should not have been called after unmount
      expect(mockOnSearchChange).not.toHaveBeenCalled();
    });
  });
});
