import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PaginationInfo, Pipeline } from "./usePipelines";
import { usePipelines } from "./usePipelines";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create pagination response
const createPaginatedResponse = (
  pipelines: Pipeline[],
  pagination: Partial<PaginationInfo> = {},
) => ({
  pipelines,
  pagination: {
    page: 0,
    limit: 50,
    totalCount: pipelines.length,
    totalPages: 1,
    hasMore: false,
    ...pagination,
  },
});

describe("usePipelines", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockPipelines: Pipeline[] = [
    {
      id: "system-1",
      name: "System Default",
      description: "Default enhancement pipeline",
      userId: null,
      visibility: "PUBLIC",
      tier: "TIER_1K",
      usageCount: 1000,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
      analysisConfig: { enabled: true },
      autoCropConfig: { enabled: true },
      promptConfig: {},
      generationConfig: { retryAttempts: 3 },
      isOwner: false,
      isSystemDefault: true,
    },
    {
      id: "my-pipeline-1",
      name: "My Custom Pipeline",
      description: "My custom settings",
      userId: "user-123",
      visibility: "PRIVATE",
      tier: "TIER_2K",
      usageCount: 10,
      createdAt: "2025-01-02T00:00:00.000Z",
      updatedAt: "2025-01-02T00:00:00.000Z",
      analysisConfig: { enabled: true },
      autoCropConfig: { enabled: false },
      promptConfig: { customInstructions: "Enhance colors" },
      generationConfig: {},
      isOwner: true,
      isSystemDefault: false,
    },
    {
      id: "public-1",
      name: "Public Vintage",
      description: "Vintage style enhancement",
      userId: "other-user",
      visibility: "PUBLIC",
      tier: "TIER_1K",
      usageCount: 50,
      createdAt: "2025-01-03T00:00:00.000Z",
      updatedAt: "2025-01-03T00:00:00.000Z",
      analysisConfig: { enabled: true },
      autoCropConfig: { enabled: true },
      promptConfig: { customInstructions: "Apply vintage look" },
      generationConfig: {},
      isOwner: false,
      isSystemDefault: false,
    },
  ];

  describe("successful fetching", () => {
    it("should fetch pipelines on mount", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createPaginatedResponse(mockPipelines),
      });

      const { result } = renderHook(() => usePipelines());

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.pipelines).toEqual([]);
      expect(result.current.error).toBeNull();

      // Wait for fetch to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.pipelines).toEqual(mockPipelines);
      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith("/api/pipelines?page=0");
    });

    it("should group pipelines by category", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createPaginatedResponse(mockPipelines),
      });

      const { result } = renderHook(() => usePipelines());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const { groupedPipelines } = result.current;

      expect(groupedPipelines.systemDefaults).toHaveLength(1);
      expect(groupedPipelines.systemDefaults[0]!.id).toBe("system-1");

      expect(groupedPipelines.myPipelines).toHaveLength(1);
      expect(groupedPipelines.myPipelines[0]!.id).toBe("my-pipeline-1");

      expect(groupedPipelines.publicPipelines).toHaveLength(1);
      expect(groupedPipelines.publicPipelines[0]!.id).toBe("public-1");
    });

    it("should provide getPipelineById helper", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createPaginatedResponse(mockPipelines),
      });

      const { result } = renderHook(() => usePipelines());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const pipeline = result.current.getPipelineById("my-pipeline-1");
      expect(pipeline?.name).toBe("My Custom Pipeline");

      const notFound = result.current.getPipelineById("nonexistent");
      expect(notFound).toBeUndefined();
    });

    it("should expose pagination info", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () =>
          createPaginatedResponse(mockPipelines, {
            page: 0,
            totalCount: 100,
            totalPages: 2,
            hasMore: true,
          }),
      });

      const { result } = renderHook(() => usePipelines());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.pagination).toEqual({
        page: 0,
        limit: 50,
        totalCount: 100,
        totalPages: 2,
        hasMore: true,
      });
      expect(result.current.hasMore).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should handle authentication error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      const { result } = renderHook(() => usePipelines());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.message).toBe(
        "You must be logged in to view pipelines",
      );
      expect(result.current.pipelines).toEqual([]);
    });

    it("should handle server error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const { result } = renderHook(() => usePipelines());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.message).toBe(
        "Failed to fetch pipelines: Internal Server Error",
      );
      expect(result.current.pipelines).toEqual([]);
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => usePipelines());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.message).toBe("Network error");
      expect(result.current.pipelines).toEqual([]);
    });

    it("should handle non-Error exceptions", async () => {
      mockFetch.mockRejectedValueOnce("String error");

      const { result } = renderHook(() => usePipelines());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.message).toBe("An unknown error occurred");
    });
  });

  describe("options", () => {
    it("should not fetch when enabled is false", async () => {
      const { result } = renderHook(() => usePipelines({ enabled: false }));

      // Should never start loading
      expect(result.current.isLoading).toBe(false);
      expect(result.current.pipelines).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should fetch when enabled becomes true", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createPaginatedResponse(mockPipelines),
      });

      const { result, rerender } = renderHook(
        ({ enabled }) => usePipelines({ enabled }),
        { initialProps: { enabled: false } },
      );

      expect(mockFetch).not.toHaveBeenCalled();

      // Enable fetching
      rerender({ enabled: true });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.current.pipelines).toEqual(mockPipelines);
    });
  });

  describe("refetch", () => {
    it("should refetch pipelines when refetch is called", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createPaginatedResponse([mockPipelines[0]!]),
      });

      const { result } = renderHook(() => usePipelines());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.pipelines).toHaveLength(1);

      // Setup new response for refetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createPaginatedResponse(mockPipelines),
      });

      // Refetch
      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.pipelines).toHaveLength(3);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should clear error on successful refetch", async () => {
      // First call fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const { result } = renderHook(() => usePipelines());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createPaginatedResponse(mockPipelines),
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.pipelines).toEqual(mockPipelines);
    });
  });

  describe("groupedPipelines edge cases", () => {
    it("should handle empty pipelines list", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createPaginatedResponse([]),
      });

      const { result } = renderHook(() => usePipelines());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.groupedPipelines.systemDefaults).toEqual([]);
      expect(result.current.groupedPipelines.myPipelines).toEqual([]);
      expect(result.current.groupedPipelines.publicPipelines).toEqual([]);
    });

    it("should handle only system defaults", async () => {
      const systemOnly = mockPipelines.filter((p) => p.isSystemDefault);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createPaginatedResponse(systemOnly),
      });

      const { result } = renderHook(() => usePipelines());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.groupedPipelines.systemDefaults).toHaveLength(1);
      expect(result.current.groupedPipelines.myPipelines).toHaveLength(0);
      expect(result.current.groupedPipelines.publicPipelines).toHaveLength(0);
    });
  });

  describe("pagination and loadMore", () => {
    it("should load more pipelines when loadMore is called", async () => {
      const page1Pipeline = mockPipelines[0]!;
      const page2Pipeline = mockPipelines[1]!;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () =>
          createPaginatedResponse([page1Pipeline], {
            page: 0,
            totalCount: 2,
            totalPages: 2,
            hasMore: true,
          }),
      });

      const { result } = renderHook(() => usePipelines());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.pipelines).toHaveLength(1);
      expect(result.current.hasMore).toBe(true);

      // Setup response for page 2
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () =>
          createPaginatedResponse([page2Pipeline], {
            page: 1,
            totalCount: 2,
            totalPages: 2,
            hasMore: false,
          }),
      });

      // Load more
      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.pipelines).toHaveLength(2);
      expect(result.current.hasMore).toBe(false);
      expect(mockFetch).toHaveBeenNthCalledWith(2, "/api/pipelines?page=1");
    });

    it("should not load more when hasMore is false", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () =>
          createPaginatedResponse(mockPipelines, {
            hasMore: false,
          }),
      });

      const { result } = renderHook(() => usePipelines());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasMore).toBe(false);

      // Try to load more
      await act(async () => {
        await result.current.loadMore();
      });

      // Should not have made another fetch
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should set isLoadingMore to false after loadMore completes", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () =>
          createPaginatedResponse([mockPipelines[0]!], {
            page: 0,
            hasMore: true,
          }),
      });

      const { result } = renderHook(() => usePipelines());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isLoadingMore).toBe(false);

      // Setup response for page 2
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () =>
          createPaginatedResponse([mockPipelines[1]!], {
            page: 1,
            hasMore: false,
          }),
      });

      // Load more
      await act(async () => {
        await result.current.loadMore();
      });

      // isLoadingMore should be false after completion
      expect(result.current.isLoadingMore).toBe(false);
      expect(result.current.pipelines).toHaveLength(2);
    });
  });
});
