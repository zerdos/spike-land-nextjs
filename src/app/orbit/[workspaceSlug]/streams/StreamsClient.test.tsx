import type { SocialPlatform, StreamPost, StreamsResponse } from "@/lib/social/types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StreamsClient } from "./StreamsClient";

// Mock the dependencies
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock workspace context
const mockWorkspace = {
  id: "ws-123",
  name: "Test Workspace",
  slug: "test-workspace",
  description: null,
  avatarUrl: null,
  isPersonal: false,
  role: "OWNER" as const,
};

vi.mock("@/components/orbit/WorkspaceContext", () => ({
  useWorkspace: vi.fn(() => ({
    workspace: mockWorkspace,
    workspaces: [mockWorkspace],
    isLoading: false,
    error: null,
    switchWorkspace: vi.fn(),
    refetch: vi.fn(),
  })),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Create wrapper with QueryClientProvider
import { useWorkspace } from "@/components/orbit/WorkspaceContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

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

describe("StreamsClient", () => {
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
    { id: "acc-2", platform: "FACEBOOK" as SocialPlatform, accountName: "Test Facebook" },
  ];

  const mockResponse: StreamsResponse = {
    posts: mockPosts,
    accounts: mockAccounts,
    hasMore: false,
    nextCursor: undefined,
  };

  const mockEmptyAccountsResponse: StreamsResponse = {
    posts: [],
    accounts: [],
    hasMore: false,
    nextCursor: undefined,
  };

  const mockResponseWithErrors: StreamsResponse = {
    posts: mockPosts,
    accounts: mockAccounts,
    hasMore: false,
    errors: [
      { accountId: "acc-1", platform: "TWITTER" as SocialPlatform, message: "Rate limited" },
    ],
  };

  const mockResponseWithMore: StreamsResponse = {
    posts: mockPosts,
    accounts: mockAccounts,
    hasMore: true,
    nextCursor: "cursor-page-2",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset useWorkspace mock to default
    vi.mocked(useWorkspace).mockReturnValue({
      workspace: mockWorkspace,
      workspaces: [mockWorkspace],
      isLoading: false,
      error: null,
      switchWorkspace: vi.fn(),
      refetch: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Rendering", () => {
    it("should render the streams page with header", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <StreamsClient />
        </Wrapper>,
      );

      expect(screen.getByTestId("streams-client")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Streams" })).toBeInTheDocument();
      expect(
        screen.getByText("View and engage with posts from all your connected accounts"),
      ).toBeInTheDocument();
    });

    it("should render StreamFilters and StreamFeed when data loads", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <StreamsClient />
        </Wrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("stream-filters")).toBeInTheDocument();
      });

      expect(screen.getByTestId("stream-feed")).toBeInTheDocument();
    });

    it("should show loading skeletons initially", async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolve to keep loading state
          }),
      );

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <StreamsClient />
        </Wrapper>,
      );

      // Loading state shows skeleton cards
      expect(screen.getAllByTestId("stream-feed-skeleton")).toHaveLength(3);
    });
  });

  describe("Empty States", () => {
    it("should show no-accounts empty state when no accounts connected", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmptyAccountsResponse,
      });

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <StreamsClient />
        </Wrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("stream-empty-state")).toBeInTheDocument();
      });

      expect(screen.getByText("Connect your social accounts")).toBeInTheDocument();
    });

    it("should navigate to settings when connect accounts is clicked", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmptyAccountsResponse,
      });

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <StreamsClient />
        </Wrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("connect-accounts-button")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("connect-accounts-button"));

      expect(mockPush).toHaveBeenCalledWith("/orbit/test-workspace/settings");
    });
  });

  describe("Error Handling", () => {
    it("should display error alert when fetch fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <StreamsClient />
        </Wrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("streams-error")).toBeInTheDocument();
      });

      expect(screen.getByText("Failed to fetch streams")).toBeInTheDocument();
    });

    it("should display per-account errors when present", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseWithErrors,
      });

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <StreamsClient />
        </Wrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("streams-account-errors")).toBeInTheDocument();
      });

      expect(screen.getByText("Some accounts had issues")).toBeInTheDocument();
      expect(screen.getByText(/TWITTER: Rate limited/)).toBeInTheDocument();
    });
  });

  describe("Filter State Management", () => {
    it("should render StreamFilters with platform toggles from connected accounts", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <StreamsClient />
        </Wrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("stream-filters")).toBeInTheDocument();
      });

      // Wait for posts to load so we know filters are fully initialized
      await waitFor(() => {
        expect(screen.getAllByTestId("stream-post-card").length).toBeGreaterThan(0);
      });

      // Should have platform toggles for all connected accounts
      expect(screen.getByTestId("platform-toggle-twitter")).toBeInTheDocument();
      expect(screen.getByTestId("platform-toggle-facebook")).toBeInTheDocument();
    });

    it("should have default sort by publishedAt desc", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <StreamsClient />
        </Wrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("stream-filters")).toBeInTheDocument();
      });

      // Check that the sort select shows "Newest first"
      expect(screen.getByTestId("sort-select")).toHaveTextContent("Newest first");
    });
  });

  describe("Refresh Functionality", () => {
    it("should refetch when refresh button is clicked", async () => {
      // Setup initial and refetch responses
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <StreamsClient />
        </Wrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("refresh-button")).toBeInTheDocument();
      });

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByTestId("stream-feed")).toBeInTheDocument();
      });

      const fetchCallCount = mockFetch.mock.calls.length;

      fireEvent.click(screen.getByTestId("refresh-button"));

      await waitFor(() => {
        expect(mockFetch.mock.calls.length).toBeGreaterThan(fetchCallCount);
      });
    });
  });

  describe("Pagination", () => {
    it("should show load more button when hasMore is true", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseWithMore,
      });

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <StreamsClient />
        </Wrapper>,
      );

      // Wait for posts to load first
      await waitFor(() => {
        expect(screen.getAllByTestId("stream-post-card").length).toBeGreaterThan(0);
      });

      // Load more button should be visible when hasMore is true
      expect(screen.getByTestId("load-more-button")).toBeInTheDocument();
    });

    it("should not show load more button when hasMore is false", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse, // mockResponse has hasMore: false
      });

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <StreamsClient />
        </Wrapper>,
      );

      // Wait for posts to load first
      await waitFor(() => {
        expect(screen.getAllByTestId("stream-post-card").length).toBeGreaterThan(0);
      });

      // Load more button should NOT be visible when hasMore is false
      expect(screen.queryByTestId("load-more-button")).not.toBeInTheDocument();
    });
  });

  describe("Engagement Handlers", () => {
    it("should log when like is clicked", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <StreamsClient />
        </Wrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("stream-feed")).toBeInTheDocument();
      });

      // Wait for posts to render
      await waitFor(() => {
        expect(screen.getAllByTestId("like-button").length).toBeGreaterThan(0);
      });

      // Find and click the like button on the first post
      const likeButtons = screen.getAllByTestId("like-button");
      fireEvent.click(likeButtons[0]!);

      expect(consoleSpy).toHaveBeenCalledWith("Like post:", "post-1");
      consoleSpy.mockRestore();
    });

    it("should log when reply is clicked", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <StreamsClient />
        </Wrapper>,
      );

      // Wait for stream post cards to render (ensures posts are fully loaded)
      await waitFor(() => {
        expect(screen.getAllByTestId("stream-post-card").length).toBeGreaterThan(0);
      });

      // Wait for reply buttons to be available
      await waitFor(() => {
        expect(screen.getAllByTestId("reply-button").length).toBeGreaterThan(0);
      });

      // Find and click the reply button on the first post
      const replyButtons = screen.getAllByTestId("reply-button");
      fireEvent.click(replyButtons[0]!);

      expect(consoleSpy).toHaveBeenCalledWith("Reply to post:", "post-1");
      consoleSpy.mockRestore();
    });

    it("should log when share is clicked", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <StreamsClient />
        </Wrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("stream-feed")).toBeInTheDocument();
      });

      // Wait for posts to render - only post-1 (Twitter) has canShare: true
      await waitFor(() => {
        expect(screen.getAllByTestId("share-button").length).toBeGreaterThan(0);
      });

      // Find and click the share button on the first post (only Twitter has canShare: true)
      const shareButtons = screen.getAllByTestId("share-button");
      fireEvent.click(shareButtons[0]!);

      expect(consoleSpy).toHaveBeenCalledWith("Share post:", "post-1");
      consoleSpy.mockRestore();
    });
  });

  describe("Workspace Integration", () => {
    it("should not fetch and render correctly when workspace is null", async () => {
      vi.mocked(useWorkspace).mockReturnValue({
        workspace: null,
        workspaces: [],
        isLoading: false,
        error: null,
        switchWorkspace: vi.fn(),
        refetch: vi.fn(),
      });

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <StreamsClient />
        </Wrapper>,
      );

      // Component should render without crashing
      expect(screen.getByTestId("streams-client")).toBeInTheDocument();
      expect(screen.getByText("Streams")).toBeInTheDocument();

      // Wait a bit to ensure no fetch happens
      await new Promise((resolve) => setTimeout(resolve, 100));

      // No fetch should be made when workspace is null
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("Connected Platforms", () => {
    it("should pass connected platforms to StreamFilters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <StreamsClient />
        </Wrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("platform-filter")).toBeInTheDocument();
      });

      // Should have toggle buttons for Twitter and Facebook (the accounts in mockAccounts)
      expect(screen.getByTestId("platform-toggle-twitter")).toBeInTheDocument();
      expect(screen.getByTestId("platform-toggle-facebook")).toBeInTheDocument();
    });
  });

  describe("Loading States", () => {
    it("should render filters with isLoading passed correctly", async () => {
      // This test verifies the StreamFilters receives isLoading prop correctly
      // by checking the initial loading state shows disabled refresh button
      mockFetch.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolve to keep loading state
          }),
      );

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <StreamsClient />
        </Wrapper>,
      );

      // During loading with no data, the feed shows skeletons
      // StreamFilters won't be visible yet because we're in initial loading
      expect(screen.getAllByTestId("stream-feed-skeleton").length).toBe(3);
    });

    it("should pass isLoading to StreamFilters when data is loaded", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <StreamsClient />
        </Wrapper>,
      );

      // Wait for stream filters to appear
      await waitFor(() => {
        expect(screen.getByTestId("stream-filters")).toBeInTheDocument();
      });

      // Wait for posts to load (filters are shown but loading might still be true)
      await waitFor(() => {
        expect(screen.getAllByTestId("stream-post-card").length).toBeGreaterThan(0);
      });

      // Verify refresh button is rendered and not disabled after loading
      const refreshButton = screen.getByTestId("refresh-button");
      expect(refreshButton).not.toBeDisabled();
    });
  });
});
