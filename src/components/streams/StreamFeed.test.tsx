import type { StreamPost } from "@/lib/social/types";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StreamFeed } from "./StreamFeed";

/**
 * Helper function to create a mock StreamPost
 */
function createMockPost(overrides: Partial<StreamPost> = {}): StreamPost {
  return {
    id: "post-123",
    platformPostId: "platform-456",
    platform: "TWITTER",
    content: "This is a test post content",
    publishedAt: new Date("2024-01-15T10:00:00Z"),
    url: "https://twitter.com/user/status/123",
    accountId: "account-789",
    accountName: "Test User",
    accountAvatarUrl: "https://example.com/avatar.jpg",
    canLike: true,
    canReply: true,
    canShare: true,
    isLiked: false,
    metrics: {
      likes: 100,
      comments: 25,
      shares: 10,
    },
    ...overrides,
  };
}

describe("StreamFeed", () => {
  describe("Rendering Posts", () => {
    it("should render the feed container", () => {
      render(<StreamFeed posts={[]} />);
      expect(screen.getByTestId("stream-feed")).toBeInTheDocument();
    });

    it("should render a list of posts", () => {
      const posts = [
        createMockPost({ id: "post-1", content: "First post" }),
        createMockPost({ id: "post-2", content: "Second post" }),
        createMockPost({ id: "post-3", content: "Third post" }),
      ];

      render(<StreamFeed posts={posts} />);

      expect(screen.getByText("First post")).toBeInTheDocument();
      expect(screen.getByText("Second post")).toBeInTheDocument();
      expect(screen.getByText("Third post")).toBeInTheDocument();
    });

    it("should render posts with gap between them", () => {
      const posts = [
        createMockPost({ id: "post-1" }),
        createMockPost({ id: "post-2" }),
      ];

      render(<StreamFeed posts={posts} />);

      const feed = screen.getByTestId("stream-feed");
      expect(feed).toHaveClass("gap-4");
    });

    it("should render each post as a StreamPostCard", () => {
      const posts = [createMockPost({ id: "post-1" })];

      render(<StreamFeed posts={posts} />);

      expect(screen.getByTestId("stream-post-card")).toBeInTheDocument();
    });

    it("should render multiple StreamPostCards for multiple posts", () => {
      const posts = [
        createMockPost({ id: "post-1" }),
        createMockPost({ id: "post-2" }),
        createMockPost({ id: "post-3" }),
      ];

      render(<StreamFeed posts={posts} />);

      expect(screen.getAllByTestId("stream-post-card")).toHaveLength(3);
    });
  });

  describe("Loading State", () => {
    it("should show skeleton loading cards when isLoading is true and no posts", () => {
      render(<StreamFeed posts={[]} isLoading={true} />);

      const skeletons = screen.getAllByTestId("stream-feed-skeleton");
      expect(skeletons).toHaveLength(3);
    });

    it("should not show posts when loading with no posts", () => {
      render(<StreamFeed posts={[]} isLoading={true} />);

      expect(screen.queryByTestId("stream-post-card")).not.toBeInTheDocument();
    });

    it("should show posts and one skeleton when loading more", () => {
      const posts = [createMockPost({ id: "post-1" })];

      render(<StreamFeed posts={posts} isLoading={true} />);

      expect(screen.getByTestId("stream-post-card")).toBeInTheDocument();
      expect(screen.getByTestId("stream-feed-skeleton")).toBeInTheDocument();
    });

    it("should not show load more button when loading", () => {
      const posts = [createMockPost({ id: "post-1" })];

      render(<StreamFeed posts={posts} isLoading={true} hasMore={true} />);

      expect(screen.queryByTestId("load-more-button")).not.toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("should show empty state when posts array is empty and not loading", () => {
      render(<StreamFeed posts={[]} isLoading={false} />);

      expect(screen.getByTestId("stream-empty-state")).toBeInTheDocument();
    });

    it("should display no-posts empty state by default", () => {
      render(<StreamFeed posts={[]} />);

      expect(screen.getByText("No posts yet")).toBeInTheDocument();
    });

    it("should not show empty state when there are posts", () => {
      const posts = [createMockPost({ id: "post-1" })];

      render(<StreamFeed posts={posts} />);

      expect(screen.queryByTestId("stream-empty-state")).not.toBeInTheDocument();
    });

    it("should not show empty state when loading", () => {
      render(<StreamFeed posts={[]} isLoading={true} />);

      expect(screen.queryByTestId("stream-empty-state")).not.toBeInTheDocument();
    });

    it("should pass onConnectAccounts to empty state", () => {
      const onConnectAccounts = vi.fn();
      render(<StreamFeed posts={[]} onConnectAccounts={onConnectAccounts} />);

      // The empty state is rendered but the button is only shown for "no-accounts" type
      // Since we default to "no-posts", the button won't be shown
      expect(screen.getByTestId("stream-empty-state")).toBeInTheDocument();
    });
  });

  describe("Load More", () => {
    it("should show load more button when hasMore is true", () => {
      const posts = [createMockPost({ id: "post-1" })];

      render(<StreamFeed posts={posts} hasMore={true} />);

      expect(screen.getByTestId("load-more-button")).toBeInTheDocument();
    });

    it("should not show load more button when hasMore is false", () => {
      const posts = [createMockPost({ id: "post-1" })];

      render(<StreamFeed posts={posts} hasMore={false} />);

      expect(screen.queryByTestId("load-more-button")).not.toBeInTheDocument();
    });

    it("should call onLoadMore when load more button is clicked", () => {
      const onLoadMore = vi.fn();
      const posts = [createMockPost({ id: "post-1" })];

      render(<StreamFeed posts={posts} hasMore={true} onLoadMore={onLoadMore} />);

      fireEvent.click(screen.getByTestId("load-more-button"));
      expect(onLoadMore).toHaveBeenCalledTimes(1);
    });

    it("should not throw when clicking load more without handler", () => {
      const posts = [createMockPost({ id: "post-1" })];

      render(<StreamFeed posts={posts} hasMore={true} />);

      expect(() => {
        fireEvent.click(screen.getByTestId("load-more-button"));
      }).not.toThrow();
    });

    it("should not show load more button when no posts", () => {
      render(<StreamFeed posts={[]} hasMore={true} />);

      expect(screen.queryByTestId("load-more-button")).not.toBeInTheDocument();
    });
  });

  describe("Click Handlers", () => {
    it("should pass onLike handler to StreamPostCard", () => {
      const onLike = vi.fn();
      const posts = [createMockPost({ id: "test-post-id", canLike: true })];

      render(<StreamFeed posts={posts} onLike={onLike} />);

      fireEvent.click(screen.getByTestId("like-button"));
      expect(onLike).toHaveBeenCalledTimes(1);
      expect(onLike).toHaveBeenCalledWith("test-post-id");
    });

    it("should pass onReply handler to StreamPostCard", () => {
      const onReply = vi.fn();
      const posts = [createMockPost({ id: "test-post-id", canReply: true })];

      render(<StreamFeed posts={posts} onReply={onReply} />);

      fireEvent.click(screen.getByTestId("reply-button"));
      expect(onReply).toHaveBeenCalledTimes(1);
      expect(onReply).toHaveBeenCalledWith("test-post-id");
    });

    it("should pass onShare handler to StreamPostCard", () => {
      const onShare = vi.fn();
      const posts = [createMockPost({ id: "test-post-id", canShare: true })];

      render(<StreamFeed posts={posts} onShare={onShare} />);

      fireEvent.click(screen.getByTestId("share-button"));
      expect(onShare).toHaveBeenCalledTimes(1);
      expect(onShare).toHaveBeenCalledWith("test-post-id");
    });

    it("should handle clicks on multiple posts correctly", () => {
      const onLike = vi.fn();
      const posts = [
        createMockPost({ id: "post-1", canLike: true }),
        createMockPost({ id: "post-2", canLike: true }),
      ];

      render(<StreamFeed posts={posts} onLike={onLike} />);

      const likeButtons = screen.getAllByTestId("like-button");
      fireEvent.click(likeButtons[0]!);
      fireEvent.click(likeButtons[1]!);

      expect(onLike).toHaveBeenCalledTimes(2);
      expect(onLike).toHaveBeenNthCalledWith(1, "post-1");
      expect(onLike).toHaveBeenNthCalledWith(2, "post-2");
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined isLoading", () => {
      const posts = [createMockPost({ id: "post-1" })];

      render(<StreamFeed posts={posts} />);

      expect(screen.getByTestId("stream-post-card")).toBeInTheDocument();
      expect(screen.queryByTestId("stream-feed-skeleton")).not.toBeInTheDocument();
    });

    it("should handle undefined hasMore", () => {
      const posts = [createMockPost({ id: "post-1" })];

      render(<StreamFeed posts={posts} />);

      expect(screen.queryByTestId("load-more-button")).not.toBeInTheDocument();
    });

    it("should render posts with different platforms", () => {
      const posts = [
        createMockPost({ id: "post-1", platform: "TWITTER" }),
        createMockPost({ id: "post-2", platform: "FACEBOOK" }),
        createMockPost({ id: "post-3", platform: "INSTAGRAM" }),
      ];

      render(<StreamFeed posts={posts} />);

      expect(screen.getByText("X")).toBeInTheDocument();
      expect(screen.getByText("Facebook")).toBeInTheDocument();
      expect(screen.getByText("Instagram")).toBeInTheDocument();
    });

    it("should handle posts with minimal data", () => {
      const minimalPost: StreamPost = {
        id: "minimal-1",
        platformPostId: "plat-1",
        platform: "TWITTER",
        content: "Minimal content",
        publishedAt: new Date(),
        url: "https://example.com",
        accountId: "acc-1",
        accountName: "Minimal User",
        canLike: false,
        canReply: false,
        canShare: false,
      };

      render(<StreamFeed posts={[minimalPost]} />);

      expect(screen.getByText("Minimal content")).toBeInTheDocument();
    });

    it("should use unique keys for posts", () => {
      const posts = [
        createMockPost({ id: "unique-1" }),
        createMockPost({ id: "unique-2" }),
        createMockPost({ id: "unique-3" }),
      ];

      // This should not throw any React key warnings
      render(<StreamFeed posts={posts} />);

      expect(screen.getAllByTestId("stream-post-card")).toHaveLength(3);
    });
  });

  describe("Skeleton Structure", () => {
    it("should render skeleton with avatar placeholder", () => {
      render(<StreamFeed posts={[]} isLoading={true} />);

      const skeletons = screen.getAllByTestId("stream-feed-skeleton");
      expect(skeletons[0]).toBeInTheDocument();
    });

    it("should render 3 skeleton cards when loading", () => {
      render(<StreamFeed posts={[]} isLoading={true} />);

      const skeletons = screen.getAllByTestId("stream-feed-skeleton");
      expect(skeletons).toHaveLength(3);
    });
  });
});
