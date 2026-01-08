import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SocialPlatform, StreamFilter, StreamPost, StreamsResponse } from "@/lib/social/types";

import { DEFAULT_POLLING_INTERVAL, useStreamFeed } from "./useStreamFeed";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Create a wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode; }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useStreamFeed", () => {
  const mockWorkspaceId = "ws-123";

  const mockPosts: StreamPost[] = [
    {
      id: "post-1",
      platformPostId: "twitter-1",
      platform: "TWITTER" as SocialPlatform,
      content: "Hello from Twitter!",
      publishedAt: new Date("2025-01-01T10:00:00Z"),
      url: "https://twitter.com/user/status/1",
      accountId: "acc-1",
      accountName: "Test Twitter",
      accountAvatarUrl: "https://example.com/avatar1.jpg",
      canLike: true,
      canReply: true,
      canShare: true,
      metrics: { likes: 10, comments: 5, shares: 2 },
    },
    {
      id: "post-2",
      platformPostId: "fb-1",
      platform: "FACEBOOK" as SocialPlatform,
      content: "Hello from Facebook!",
      publishedAt: new Date("2025-01-01T09:00:00Z"),
      url: "https://facebook.com/posts/1",
      accountId: "acc-2",
      accountName: "Test Facebook",
      canLike: true,
      canReply: true,
      canShare: false,
      metrics: { likes: 20, comments: 3, shares: 0 },
    },
  ];

  const mockAccounts: StreamsResponse["accounts"] = [
    {
      id: "acc-1",
      platform: "TWITTER" as SocialPlatform,
      accountName: "Test Twitter",
      avatarUrl: "https://example.com/avatar1.jpg",
    },
    {
      id: "acc-2",
      platform: "FACEBOOK" as SocialPlatform,
      accountName: "Test Facebook",
    },
  ];

  const mockResponse: StreamsResponse = {
    posts: mockPosts,
    accounts: mockAccounts,
    hasMore: false,
    nextCursor: undefined,
  };

  const mockResponseWithMore: StreamsResponse = {
    posts: mockPosts,
    accounts: mockAccounts,
    hasMore: true,
    nextCursor: "cursor-page-2",
  };

  const mockPage2Posts: StreamPost[] = [
    {
      id: "post-3",
      platformPostId: "ig-1",
      platform: "INSTAGRAM" as SocialPlatform,
      content: "Hello from Instagram!",
      publishedAt: new Date("2025-01-01T08:00:00Z"),
      url: "https://instagram.com/p/1",
      accountId: "acc-3",
      accountName: "Test Instagram",
      canLike: true,
      canReply: true,
      canShare: false,
      metrics: { likes: 50, comments: 10, shares: 0 },
    },
  ];

  const mockPage2Response: StreamsResponse = {
    posts: mockPage2Posts,
    accounts: mockAccounts,
    hasMore: false,
    nextCursor: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial loading", () => {
    it("should be in loading state initially", () => {
      mockFetch.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolve to keep loading state
          }),
      );

      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId }),
        { wrapper: createWrapper() },
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.posts).toEqual([]);
      expect(result.current.accounts).toEqual([]);
      expect(result.current.errors).toBeUndefined();
      expect(result.current.hasMore).toBe(false);
    });

    it("should fetch streams on mount", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.posts).toEqual(mockPosts);
      expect(result.current.accounts).toEqual(mockAccounts);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/social/streams?"),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`workspaceId=${mockWorkspaceId}`),
      );
    });

    it("should not fetch when enabled is false", async () => {
      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId, enabled: false }),
        { wrapper: createWrapper() },
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it("should fetch when enabled changes from false to true", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result, rerender } = renderHook(
        ({ enabled }: { enabled: boolean; }) =>
          useStreamFeed({ workspaceId: mockWorkspaceId, enabled }),
        {
          wrapper: createWrapper(),
          initialProps: { enabled: false },
        },
      );

      expect(mockFetch).not.toHaveBeenCalled();

      rerender({ enabled: true });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.current.posts).toEqual(mockPosts);
    });
  });

  describe("error handling", () => {
    it("should handle fetch error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("Failed to fetch streams");
      expect(result.current.posts).toEqual([]);
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error?.message).toBe("Network error");
    });

    it("should return per-account errors from response", async () => {
      const responseWithErrors: StreamsResponse = {
        ...mockResponse,
        errors: [
          {
            accountId: "acc-1",
            platform: "TWITTER" as SocialPlatform,
            message: "Rate limited",
          },
          {
            accountId: "acc-2",
            platform: "FACEBOOK" as SocialPlatform,
            message: "Token expired",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => responseWithErrors,
      });

      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const errors = result.current.errors!;
      expect(errors).toHaveLength(2);
      expect(errors[0]!.message).toBe("Rate limited");
      expect(errors[1]!.message).toBe("Token expired");
    });
  });

  describe("pagination", () => {
    it("should indicate hasMore when more pages available", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseWithMore,
      });

      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasMore).toBe(true);
    });

    it("should fetch next page and flatten posts", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponseWithMore,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPage2Response,
        });

      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.posts).toHaveLength(2);
      expect(result.current.hasMore).toBe(true);

      // Fetch next page
      act(() => {
        result.current.fetchNextPage();
      });

      await waitFor(() => {
        expect(result.current.isFetchingNextPage).toBe(false);
      });

      // Posts should be flattened from both pages
      const posts = result.current.posts;
      expect(posts).toHaveLength(3);
      expect(posts[2]!.id).toBe("post-3");
      expect(result.current.hasMore).toBe(false);
    });

    it("should pass cursor when fetching next page", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponseWithMore,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPage2Response,
        });

      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.fetchNextPage();
      });

      await waitFor(() => {
        expect(result.current.isFetchingNextPage).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining("cursor=cursor-page-2"),
      );
    });

    it("should indicate isFetchingNextPage during pagination", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseWithMore,
      });

      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock slow response for next page using a deferred promise
      let resolveNextPage: (value: unknown) => void;
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveNextPage = resolve;
          }),
      );

      act(() => {
        result.current.fetchNextPage();
      });

      // Check isFetchingNextPage becomes true
      await waitFor(() => {
        expect(result.current.isFetchingNextPage).toBe(true);
      });

      // Now resolve the promise
      act(() => {
        resolveNextPage({
          ok: true,
          json: async () => mockPage2Response,
        });
      });

      await waitFor(() => {
        expect(result.current.isFetchingNextPage).toBe(false);
      });
    });
  });

  describe("filters", () => {
    it("should include platform filter in query params", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const filters: StreamFilter = {
        platforms: ["TWITTER" as SocialPlatform, "FACEBOOK" as SocialPlatform],
        sortBy: "publishedAt",
        sortOrder: "desc",
      };

      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId, filters }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const calledUrl = mockFetch.mock.calls[0]![0] as string;
      expect(calledUrl).toContain("platforms=TWITTER%2CFACEBOOK");
    });

    it("should include sort options in query params", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const filters: StreamFilter = {
        sortBy: "likes",
        sortOrder: "asc",
      };

      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId, filters }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const calledUrl = mockFetch.mock.calls[0]![0] as string;
      expect(calledUrl).toContain("sortBy=likes");
      expect(calledUrl).toContain("sortOrder=asc");
    });

    it("should include search query in query params", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const filters: StreamFilter = {
        searchQuery: "hello world",
        sortBy: "publishedAt",
        sortOrder: "desc",
      };

      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId, filters }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const calledUrl = mockFetch.mock.calls[0]![0] as string;
      // URLSearchParams encodes spaces as + not %20
      expect(calledUrl).toContain("searchQuery=hello+world");
    });

    it("should include date range in query params", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const startDate = new Date("2025-01-01T00:00:00Z");
      const endDate = new Date("2025-01-31T23:59:59Z");

      const filters: StreamFilter = {
        dateRange: { start: startDate, end: endDate },
        sortBy: "publishedAt",
        sortOrder: "desc",
      };

      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId, filters }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const calledUrl = mockFetch.mock.calls[0]![0] as string;
      expect(calledUrl).toContain("startDate=");
      expect(calledUrl).toContain("endDate=");
    });

    it("should refetch when filters change", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const initialFilters: StreamFilter = {
        sortBy: "publishedAt",
        sortOrder: "desc",
      };

      const { result, rerender } = renderHook(
        ({ filters }: { filters: StreamFilter; }) =>
          useStreamFeed({ workspaceId: mockWorkspaceId, filters }),
        {
          wrapper: createWrapper(),
          initialProps: { filters: initialFilters },
        },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Change filters
      const newFilters: StreamFilter = {
        platforms: ["TWITTER" as SocialPlatform],
        sortBy: "likes",
        sortOrder: "desc",
      };

      rerender({ filters: newFilters });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      const secondCallUrl = mockFetch.mock.calls[1]![0] as string;
      expect(secondCallUrl).toContain("platforms=TWITTER");
      expect(secondCallUrl).toContain("sortBy=likes");
    });

    it("should not refetch when filters are deeply equal", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const filters1: StreamFilter = {
        platforms: ["TWITTER" as SocialPlatform, "FACEBOOK" as SocialPlatform],
        sortBy: "publishedAt",
        sortOrder: "desc",
      };

      const { rerender } = renderHook(
        ({ filters }: { filters: StreamFilter; }) =>
          useStreamFeed({ workspaceId: mockWorkspaceId, filters }),
        {
          wrapper: createWrapper(),
          initialProps: { filters: filters1 },
        },
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Rerender with same filter values but different object reference
      // Platforms in different order but same values
      const filters2: StreamFilter = {
        platforms: ["FACEBOOK" as SocialPlatform, "TWITTER" as SocialPlatform],
        sortBy: "publishedAt",
        sortOrder: "desc",
      };

      rerender({ filters: filters2 });

      // Wait a bit to ensure no extra fetch
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should still only be 1 fetch since normalized filters are equal
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("query key", () => {
    it("should include workspaceId in query key", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const { rerender } = renderHook(
        ({ workspaceId }: { workspaceId: string; }) => useStreamFeed({ workspaceId }),
        {
          wrapper: createWrapper(),
          initialProps: { workspaceId: "ws-123" },
        },
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Change workspaceId
      rerender({ workspaceId: "ws-456" });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining("workspaceId=ws-456"),
      );
    });
  });

  describe("refetch", () => {
    it("should refetch data when refetch is called", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Setup new response for refetch
      const newPosts = [mockPosts[0]];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockResponse, posts: newPosts }),
      });

      await act(async () => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.isRefetching).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.current.posts).toEqual(newPosts);
    });

    it("should indicate isRefetching during refetch", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock slow response for refetch using a deferred promise
      let resolveRefetch: (value: unknown) => void;
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRefetch = resolve;
          }),
      );

      act(() => {
        result.current.refetch();
      });

      // Check isRefetching becomes true
      await waitFor(() => {
        expect(result.current.isRefetching).toBe(true);
      });

      // Now resolve the promise
      act(() => {
        resolveRefetch({
          ok: true,
          json: async () => mockResponse,
        });
      });

      await waitFor(() => {
        expect(result.current.isRefetching).toBe(false);
      });
    });
  });

  describe("empty states", () => {
    it("should handle empty posts array", async () => {
      const emptyResponse: StreamsResponse = {
        posts: [],
        accounts: mockAccounts,
        hasMore: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => emptyResponse,
      });

      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.posts).toEqual([]);
      expect(result.current.accounts).toEqual(mockAccounts);
      expect(result.current.isError).toBe(false);
    });

    it("should handle empty accounts array", async () => {
      const noAccountsResponse: StreamsResponse = {
        posts: [],
        accounts: [],
        hasMore: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => noAccountsResponse,
      });

      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.accounts).toEqual([]);
    });

    it("should return undefined for errors when none present", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.errors).toBeUndefined();
    });
  });

  describe("accounts consistency across pages", () => {
    it("should use accounts from the first page", async () => {
      const page2AccountsMock: StreamsResponse["accounts"] = [
        {
          id: "acc-3",
          platform: "INSTAGRAM" as SocialPlatform,
          accountName: "Different Account",
        },
      ];

      const page2WithDifferentAccounts: StreamsResponse = {
        ...mockPage2Response,
        accounts: page2AccountsMock,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponseWithMore,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => page2WithDifferentAccounts,
        });

      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.fetchNextPage();
      });

      await waitFor(() => {
        expect(result.current.isFetchingNextPage).toBe(false);
      });

      // Should still use accounts from first page
      expect(result.current.accounts).toEqual(mockAccounts);
    });
  });

  describe("errors aggregation across pages", () => {
    it("should aggregate errors from all pages", async () => {
      const page1WithErrors: StreamsResponse = {
        ...mockResponseWithMore,
        errors: [{
          accountId: "acc-1",
          platform: "TWITTER" as SocialPlatform,
          message: "Rate limited",
        }],
      };

      const page2WithErrors: StreamsResponse = {
        ...mockPage2Response,
        errors: [{
          accountId: "acc-2",
          platform: "FACEBOOK" as SocialPlatform,
          message: "Token expired",
        }],
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => page1WithErrors,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => page2WithErrors,
        });

      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.fetchNextPage();
      });

      await waitFor(() => {
        expect(result.current.isFetchingNextPage).toBe(false);
      });

      const errorsAggregated = result.current.errors!;
      expect(errorsAggregated).toHaveLength(2);
      expect(errorsAggregated[0]!.message).toBe("Rate limited");
      expect(errorsAggregated[1]!.message).toBe("Token expired");
    });
  });

  describe("polling", () => {
    it("should export DEFAULT_POLLING_INTERVAL constant", () => {
      expect(DEFAULT_POLLING_INTERVAL).toBe(30000);
    });

    it("should have isPolling true by default when enabled", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPolling).toBe(true);
    });

    it("should have isPolling false when pollingInterval is 0", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId, pollingInterval: 0 }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPolling).toBe(false);
    });

    it("should have isPolling false when enabled is false", async () => {
      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId, enabled: false }),
        { wrapper: createWrapper() },
      );

      expect(result.current.isPolling).toBe(false);
    });

    it("should pause polling when document is hidden", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPolling).toBe(true);

      // Simulate document becoming hidden
      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        configurable: true,
      });
      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });

      expect(result.current.isPolling).toBe(false);

      // Restore visible state
      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        configurable: true,
      });
      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });

      expect(result.current.isPolling).toBe(true);
    });

    it("should use custom pollingInterval when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const customInterval = 60000;
      const { result } = renderHook(
        () =>
          useStreamFeed({
            workspaceId: mockWorkspaceId,
            pollingInterval: customInterval,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPolling).toBe(true);
    });
  });

  describe("new posts detection", () => {
    it("should initialize newPostsCount to 0", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.newPostsCount).toBe(0);
    });

    it("should detect new posts on subsequent fetches", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.newPostsCount).toBe(0);

      // Simulate polling with new posts
      const newPost: StreamPost = {
        id: "post-new",
        platformPostId: "twitter-new",
        platform: "TWITTER" as SocialPlatform,
        content: "New post!",
        publishedAt: new Date("2025-01-02T10:00:00Z"),
        url: "https://twitter.com/user/status/new",
        accountId: "acc-1",
        accountName: "Test Twitter",
        canLike: true,
        canReply: true,
        canShare: true,
        metrics: { likes: 0, comments: 0, shares: 0 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockResponse,
          posts: [newPost, ...mockPosts],
        }),
      });

      await act(async () => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.isRefetching).toBe(false);
      });

      // Wait for the effect to update newPostsCount
      await waitFor(() => {
        expect(result.current.newPostsCount).toBe(1);
      });
    });

    it("should accumulate new posts count across multiple fetches", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // First refetch with 1 new post
      const newPost1: StreamPost = {
        id: "post-new-1",
        platformPostId: "twitter-new-1",
        platform: "TWITTER" as SocialPlatform,
        content: "New post 1!",
        publishedAt: new Date("2025-01-02T10:00:00Z"),
        url: "https://twitter.com/user/status/new1",
        accountId: "acc-1",
        accountName: "Test Twitter",
        canLike: true,
        canReply: true,
        canShare: true,
        metrics: { likes: 0, comments: 0, shares: 0 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockResponse,
          posts: [newPost1, ...mockPosts],
        }),
      });

      await act(async () => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.isRefetching).toBe(false);
      });

      // Wait for effect to update newPostsCount
      await waitFor(() => {
        expect(result.current.newPostsCount).toBe(1);
      });

      // Second refetch with another new post
      const newPost2: StreamPost = {
        id: "post-new-2",
        platformPostId: "twitter-new-2",
        platform: "TWITTER" as SocialPlatform,
        content: "New post 2!",
        publishedAt: new Date("2025-01-02T11:00:00Z"),
        url: "https://twitter.com/user/status/new2",
        accountId: "acc-1",
        accountName: "Test Twitter",
        canLike: true,
        canReply: true,
        canShare: true,
        metrics: { likes: 0, comments: 0, shares: 0 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockResponse,
          posts: [newPost2, newPost1, ...mockPosts],
        }),
      });

      await act(async () => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.isRefetching).toBe(false);
      });

      // Wait for effect to accumulate newPostsCount
      await waitFor(() => {
        expect(result.current.newPostsCount).toBe(2);
      });
    });

    it("should reset newPostsCount when acknowledgeNewPosts is called", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Add a new post
      const newPost: StreamPost = {
        id: "post-new",
        platformPostId: "twitter-new",
        platform: "TWITTER" as SocialPlatform,
        content: "New post!",
        publishedAt: new Date("2025-01-02T10:00:00Z"),
        url: "https://twitter.com/user/status/new",
        accountId: "acc-1",
        accountName: "Test Twitter",
        canLike: true,
        canReply: true,
        canShare: true,
        metrics: { likes: 0, comments: 0, shares: 0 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockResponse,
          posts: [newPost, ...mockPosts],
        }),
      });

      await act(async () => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.isRefetching).toBe(false);
      });

      // Wait for effect to update newPostsCount
      await waitFor(() => {
        expect(result.current.newPostsCount).toBe(1);
      });

      // Acknowledge new posts
      act(() => {
        result.current.acknowledgeNewPosts();
      });

      expect(result.current.newPostsCount).toBe(0);
    });

    it("should reset new posts tracking when workspaceId changes", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const { result, rerender } = renderHook(
        ({ workspaceId }: { workspaceId: string; }) => useStreamFeed({ workspaceId }),
        {
          wrapper: createWrapper(),
          initialProps: { workspaceId: "ws-123" },
        },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Add a new post
      const newPost: StreamPost = {
        id: "post-new",
        platformPostId: "twitter-new",
        platform: "TWITTER" as SocialPlatform,
        content: "New post!",
        publishedAt: new Date("2025-01-02T10:00:00Z"),
        url: "https://twitter.com/user/status/new",
        accountId: "acc-1",
        accountName: "Test Twitter",
        canLike: true,
        canReply: true,
        canShare: true,
        metrics: { likes: 0, comments: 0, shares: 0 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockResponse,
          posts: [newPost, ...mockPosts],
        }),
      });

      await act(async () => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.isRefetching).toBe(false);
      });

      // Wait for effect to update newPostsCount
      await waitFor(() => {
        expect(result.current.newPostsCount).toBe(1);
      });

      // Change workspaceId
      rerender({ workspaceId: "ws-456" });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.newPostsCount).toBe(0);
    });

    it("should reset new posts tracking when filters change", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const initialFilters: StreamFilter = {
        sortBy: "publishedAt",
        sortOrder: "desc",
      };

      const { result, rerender } = renderHook(
        ({ filters }: { filters: StreamFilter; }) =>
          useStreamFeed({ workspaceId: mockWorkspaceId, filters }),
        {
          wrapper: createWrapper(),
          initialProps: { filters: initialFilters },
        },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Add a new post
      const newPost: StreamPost = {
        id: "post-new",
        platformPostId: "twitter-new",
        platform: "TWITTER" as SocialPlatform,
        content: "New post!",
        publishedAt: new Date("2025-01-02T10:00:00Z"),
        url: "https://twitter.com/user/status/new",
        accountId: "acc-1",
        accountName: "Test Twitter",
        canLike: true,
        canReply: true,
        canShare: true,
        metrics: { likes: 0, comments: 0, shares: 0 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockResponse,
          posts: [newPost, ...mockPosts],
        }),
      });

      await act(async () => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.isRefetching).toBe(false);
      });

      // Wait for effect to update newPostsCount
      await waitFor(() => {
        expect(result.current.newPostsCount).toBe(1);
      });

      // Change filters
      const newFilters: StreamFilter = {
        platforms: ["TWITTER" as SocialPlatform],
        sortBy: "likes",
        sortOrder: "desc",
      };

      rerender({ filters: newFilters });

      await waitFor(() => {
        expect(mockFetch.mock.calls.length).toBeGreaterThan(2);
      });

      expect(result.current.newPostsCount).toBe(0);
    });

    it("should not count existing posts as new on refetch", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.newPostsCount).toBe(0);

      // Refetch with same posts (no new posts)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await act(async () => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.isRefetching).toBe(false);
      });

      expect(result.current.newPostsCount).toBe(0);
    });

    it("should handle empty posts array", async () => {
      const emptyResponse: StreamsResponse = {
        posts: [],
        accounts: mockAccounts,
        hasMore: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => emptyResponse,
      });

      const { result } = renderHook(
        () => useStreamFeed({ workspaceId: mockWorkspaceId }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.newPostsCount).toBe(0);
      expect(result.current.posts).toEqual([]);
    });
  });
});
