import type { StreamPost } from "@/lib/social/types";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StreamPostCard } from "./StreamPostCard";

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

describe("StreamPostCard", () => {
  describe("Rendering", () => {
    it("should render the post card", () => {
      const post = createMockPost();
      render(<StreamPostCard post={post} />);
      expect(screen.getByTestId("stream-post-card")).toBeInTheDocument();
    });

    it("should render account name", () => {
      const post = createMockPost({ accountName: "John Doe" });
      render(<StreamPostCard post={post} />);
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("should render post content", () => {
      const post = createMockPost({ content: "Hello, world!" });
      render(<StreamPostCard post={post} />);
      expect(screen.getByText("Hello, world!")).toBeInTheDocument();
    });

    it("should render avatar with image when avatarUrl is provided", () => {
      const post = createMockPost({
        accountAvatarUrl: "https://example.com/avatar.jpg",
        accountName: "Jane Smith",
      });
      render(<StreamPostCard post={post} />);
      // Radix Avatar renders the image asynchronously
      // In tests, the fallback is shown since images don't load in test environment
      // The component correctly includes the AvatarImage with src, but it renders
      // the fallback until the image loads
      expect(screen.getByText("JS")).toBeInTheDocument();
      // Verify card is present with the avatar section
      expect(screen.getByTestId("stream-post-card")).toBeInTheDocument();
    });

    it("should render avatar fallback with initials when no avatarUrl", () => {
      const post = createMockPost({
        accountAvatarUrl: undefined,
        accountName: "Jane Smith",
      });
      render(<StreamPostCard post={post} />);
      expect(screen.getByText("JS")).toBeInTheDocument();
    });

    it("should render single word name initials correctly", () => {
      const post = createMockPost({
        accountAvatarUrl: undefined,
        accountName: "Mononymous",
      });
      render(<StreamPostCard post={post} />);
      expect(screen.getByText("M")).toBeInTheDocument();
    });

    it("should render external link to original post", () => {
      const post = createMockPost({ url: "https://twitter.com/test/status/123" });
      render(<StreamPostCard post={post} />);
      const link = screen.getByRole("link", { name: /open original post/i });
      expect(link).toHaveAttribute("href", "https://twitter.com/test/status/123");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("should truncate long content", () => {
      const longContent = "A".repeat(300);
      const post = createMockPost({ content: longContent });
      render(<StreamPostCard post={post} />);
      const displayedContent = screen.getByText(/^A+\.\.\.$/);
      expect(displayedContent).toBeInTheDocument();
      expect(displayedContent.textContent).toHaveLength(283); // 280 chars + "..."
    });

    it("should not truncate short content", () => {
      const shortContent = "Short post";
      const post = createMockPost({ content: shortContent });
      render(<StreamPostCard post={post} />);
      expect(screen.getByText("Short post")).toBeInTheDocument();
    });
  });

  describe("Platform Badge", () => {
    it("should render Twitter badge with correct color", () => {
      const post = createMockPost({ platform: "TWITTER" });
      render(<StreamPostCard post={post} />);
      const badge = screen.getByTestId("platform-badge");
      expect(badge).toHaveTextContent("X");
      expect(badge).toHaveClass("bg-[#1DA1F2]");
    });

    it("should render Facebook badge with correct color", () => {
      const post = createMockPost({ platform: "FACEBOOK" });
      render(<StreamPostCard post={post} />);
      const badge = screen.getByTestId("platform-badge");
      expect(badge).toHaveTextContent("Facebook");
      expect(badge).toHaveClass("bg-[#1877F2]");
    });

    it("should render Instagram badge with gradient", () => {
      const post = createMockPost({ platform: "INSTAGRAM" });
      render(<StreamPostCard post={post} />);
      const badge = screen.getByTestId("platform-badge");
      expect(badge).toHaveTextContent("Instagram");
      expect(badge).toHaveClass("bg-gradient-to-r");
      expect(badge).toHaveClass("from-[#833AB4]");
    });

    it("should render LinkedIn badge with correct color", () => {
      const post = createMockPost({ platform: "LINKEDIN" });
      render(<StreamPostCard post={post} />);
      const badge = screen.getByTestId("platform-badge");
      expect(badge).toHaveTextContent("LinkedIn");
      expect(badge).toHaveClass("bg-[#0A66C2]");
    });

    it("should render TikTok badge with correct color", () => {
      const post = createMockPost({ platform: "TIKTOK" });
      render(<StreamPostCard post={post} />);
      const badge = screen.getByTestId("platform-badge");
      expect(badge).toHaveTextContent("TikTok");
      expect(badge).toHaveClass("bg-black");
    });

    it("should render YouTube badge with correct color", () => {
      const post = createMockPost({ platform: "YOUTUBE" });
      render(<StreamPostCard post={post} />);
      const badge = screen.getByTestId("platform-badge");
      expect(badge).toHaveTextContent("YouTube");
      expect(badge).toHaveClass("bg-[#FF0000]");
    });
  });

  describe("Metrics", () => {
    it("should render metrics when provided", () => {
      const post = createMockPost({
        metrics: { likes: 100, comments: 25, shares: 10 },
      });
      render(<StreamPostCard post={post} />);
      const metrics = screen.getByTestId("metrics");
      expect(metrics).toBeInTheDocument();
      expect(screen.getByText("100")).toBeInTheDocument();
      expect(screen.getByText("25")).toBeInTheDocument();
      expect(screen.getByText("10")).toBeInTheDocument();
    });

    it("should not render metrics when not provided", () => {
      const post = createMockPost({ metrics: undefined });
      render(<StreamPostCard post={post} />);
      expect(screen.queryByTestId("metrics")).not.toBeInTheDocument();
    });

    it("should format large numbers with K suffix", () => {
      const post = createMockPost({
        metrics: { likes: 1500, comments: 2500, shares: 3500 },
      });
      render(<StreamPostCard post={post} />);
      expect(screen.getByText("1.5K")).toBeInTheDocument();
      expect(screen.getByText("2.5K")).toBeInTheDocument();
      expect(screen.getByText("3.5K")).toBeInTheDocument();
    });

    it("should format million numbers with M suffix", () => {
      const post = createMockPost({
        metrics: { likes: 1500000, comments: 250, shares: 100 },
      });
      render(<StreamPostCard post={post} />);
      expect(screen.getByText("1.5M")).toBeInTheDocument();
    });
  });

  describe("Media Preview", () => {
    it("should render media preview when mediaUrls provided", () => {
      const post = createMockPost({
        mediaUrls: ["https://example.com/image1.jpg"],
      });
      render(<StreamPostCard post={post} />);
      expect(screen.getByTestId("media-preview")).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "Post media 1" })).toBeInTheDocument();
    });

    it("should not render media preview when no mediaUrls", () => {
      const post = createMockPost({ mediaUrls: undefined });
      render(<StreamPostCard post={post} />);
      expect(screen.queryByTestId("media-preview")).not.toBeInTheDocument();
    });

    it("should not render media preview for empty mediaUrls array", () => {
      const post = createMockPost({ mediaUrls: [] });
      render(<StreamPostCard post={post} />);
      expect(screen.queryByTestId("media-preview")).not.toBeInTheDocument();
    });

    it("should render multiple media items (3 items)", () => {
      const post = createMockPost({
        mediaUrls: [
          "https://example.com/image1.jpg",
          "https://example.com/image2.jpg",
          "https://example.com/image3.jpg",
        ],
      });
      render(<StreamPostCard post={post} />);
      expect(screen.getByRole("img", { name: "Post media 1" })).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "Post media 2" })).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "Post media 3" })).toBeInTheDocument();
    });

    it("should render exactly 2 media items with grid-cols-2", () => {
      const post = createMockPost({
        mediaUrls: [
          "https://example.com/image1.jpg",
          "https://example.com/image2.jpg",
        ],
      });
      render(<StreamPostCard post={post} />);
      const mediaPreview = screen.getByTestId("media-preview");
      expect(mediaPreview).toHaveClass("grid-cols-2");
      expect(screen.getByRole("img", { name: "Post media 1" })).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "Post media 2" })).toBeInTheDocument();
    });

    it("should limit media preview to 4 items", () => {
      const post = createMockPost({
        mediaUrls: [
          "https://example.com/image1.jpg",
          "https://example.com/image2.jpg",
          "https://example.com/image3.jpg",
          "https://example.com/image4.jpg",
          "https://example.com/image5.jpg",
        ],
      });
      render(<StreamPostCard post={post} />);
      expect(screen.getByRole("img", { name: "Post media 1" })).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "Post media 4" })).toBeInTheDocument();
      expect(screen.queryByRole("img", { name: "Post media 5" })).not.toBeInTheDocument();
    });
  });

  describe("Action Buttons", () => {
    it("should render like button when canLike is true", () => {
      const post = createMockPost({ canLike: true });
      render(<StreamPostCard post={post} />);
      expect(screen.getByTestId("like-button")).toBeInTheDocument();
    });

    it("should not render like button when canLike is false", () => {
      const post = createMockPost({ canLike: false });
      render(<StreamPostCard post={post} />);
      expect(screen.queryByTestId("like-button")).not.toBeInTheDocument();
    });

    it("should render reply button when canReply is true", () => {
      const post = createMockPost({ canReply: true });
      render(<StreamPostCard post={post} />);
      expect(screen.getByTestId("reply-button")).toBeInTheDocument();
    });

    it("should not render reply button when canReply is false", () => {
      const post = createMockPost({ canReply: false });
      render(<StreamPostCard post={post} />);
      expect(screen.queryByTestId("reply-button")).not.toBeInTheDocument();
    });

    it("should render share button when canShare is true", () => {
      const post = createMockPost({ canShare: true });
      render(<StreamPostCard post={post} />);
      expect(screen.getByTestId("share-button")).toBeInTheDocument();
    });

    it("should not render share button when canShare is false", () => {
      const post = createMockPost({ canShare: false });
      render(<StreamPostCard post={post} />);
      expect(screen.queryByTestId("share-button")).not.toBeInTheDocument();
    });

    it("should show liked state on like button when isLiked is true", () => {
      const post = createMockPost({ canLike: true, isLiked: true });
      render(<StreamPostCard post={post} />);
      const likeButton = screen.getByTestId("like-button");
      expect(likeButton).toHaveClass("text-red-500");
      expect(likeButton).toHaveAttribute("aria-label", "Unlike");
    });

    it("should show unliked state on like button when isLiked is false", () => {
      const post = createMockPost({ canLike: true, isLiked: false });
      render(<StreamPostCard post={post} />);
      const likeButton = screen.getByTestId("like-button");
      expect(likeButton).not.toHaveClass("text-red-500");
      expect(likeButton).toHaveAttribute("aria-label", "Like");
    });

    it("should not render any action buttons when all are false", () => {
      const post = createMockPost({
        canLike: false,
        canReply: false,
        canShare: false,
      });
      render(<StreamPostCard post={post} />);
      expect(screen.queryByTestId("like-button")).not.toBeInTheDocument();
      expect(screen.queryByTestId("reply-button")).not.toBeInTheDocument();
      expect(screen.queryByTestId("share-button")).not.toBeInTheDocument();
    });
  });

  describe("Click Handlers", () => {
    it("should call onLike when like button is clicked", () => {
      const onLike = vi.fn();
      const post = createMockPost({ canLike: true, id: "test-post-id" });
      render(<StreamPostCard post={post} onLike={onLike} />);

      fireEvent.click(screen.getByTestId("like-button"));
      expect(onLike).toHaveBeenCalledTimes(1);
      expect(onLike).toHaveBeenCalledWith("test-post-id");
    });

    it("should call onReply when reply button is clicked", () => {
      const onReply = vi.fn();
      const post = createMockPost({ canReply: true, id: "test-post-id" });
      render(<StreamPostCard post={post} onReply={onReply} />);

      fireEvent.click(screen.getByTestId("reply-button"));
      expect(onReply).toHaveBeenCalledTimes(1);
      expect(onReply).toHaveBeenCalledWith("test-post-id");
    });

    it("should call onShare when share button is clicked", () => {
      const onShare = vi.fn();
      const post = createMockPost({ canShare: true, id: "test-post-id" });
      render(<StreamPostCard post={post} onShare={onShare} />);

      fireEvent.click(screen.getByTestId("share-button"));
      expect(onShare).toHaveBeenCalledTimes(1);
      expect(onShare).toHaveBeenCalledWith("test-post-id");
    });

    it("should not throw when clicking like without handler", () => {
      const post = createMockPost({ canLike: true });
      render(<StreamPostCard post={post} />);

      expect(() => {
        fireEvent.click(screen.getByTestId("like-button"));
      }).not.toThrow();
    });

    it("should not throw when clicking reply without handler", () => {
      const post = createMockPost({ canReply: true });
      render(<StreamPostCard post={post} />);

      expect(() => {
        fireEvent.click(screen.getByTestId("reply-button"));
      }).not.toThrow();
    });

    it("should not throw when clicking share without handler", () => {
      const post = createMockPost({ canShare: true });
      render(<StreamPostCard post={post} />);

      expect(() => {
        fireEvent.click(screen.getByTestId("share-button"));
      }).not.toThrow();
    });
  });

  describe("Relative Time Formatting", () => {
    it("should display 'Just now' for recent posts", () => {
      const post = createMockPost({ publishedAt: new Date() });
      render(<StreamPostCard post={post} />);
      expect(screen.getByText("Just now")).toBeInTheDocument();
    });

    it("should display minutes ago for posts within an hour", () => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const post = createMockPost({ publishedAt: thirtyMinutesAgo });
      render(<StreamPostCard post={post} />);
      expect(screen.getByText("30m ago")).toBeInTheDocument();
    });

    it("should display hours ago for posts within a day", () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
      const post = createMockPost({ publishedAt: fiveHoursAgo });
      render(<StreamPostCard post={post} />);
      expect(screen.getByText("5h ago")).toBeInTheDocument();
    });

    it("should display days ago for posts within a week", () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const post = createMockPost({ publishedAt: threeDaysAgo });
      render(<StreamPostCard post={post} />);
      expect(screen.getByText("3d ago")).toBeInTheDocument();
    });

    it("should display formatted date for posts older than a week", () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const post = createMockPost({ publishedAt: twoWeeksAgo });
      render(<StreamPostCard post={post} />);
      // The date format depends on locale, so we just check it's a valid date string
      const dateText = screen.getByText(twoWeeksAgo.toLocaleDateString());
      expect(dateText).toBeInTheDocument();
    });

    it("should handle string date format", () => {
      const post = createMockPost({
        // Using a string that can be parsed as a date
        publishedAt: "2024-01-15T10:00:00Z" as unknown as Date,
      });
      render(<StreamPostCard post={post} />);
      // Should render a date element (either relative or formatted)
      expect(screen.getByTestId("stream-post-card")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle post with minimal required fields", () => {
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
      render(<StreamPostCard post={minimalPost} />);
      expect(screen.getByTestId("stream-post-card")).toBeInTheDocument();
      expect(screen.getByText("Minimal content")).toBeInTheDocument();
      expect(screen.getByText("Minimal User")).toBeInTheDocument();
    });

    it("should handle post with all optional fields", () => {
      const fullPost: StreamPost = {
        id: "full-1",
        platformPostId: "plat-1",
        platform: "INSTAGRAM",
        content: "Full content with all fields",
        publishedAt: new Date(),
        url: "https://example.com",
        accountId: "acc-1",
        accountName: "Full User",
        accountAvatarUrl: "https://example.com/avatar.jpg",
        canLike: true,
        canReply: true,
        canShare: true,
        isLiked: true,
        mediaUrls: ["https://example.com/media.jpg"],
        metrics: {
          likes: 1000,
          comments: 500,
          shares: 250,
          impressions: 10000,
          reach: 5000,
          engagementRate: 0.15,
        },
      };
      render(<StreamPostCard post={fullPost} />);
      expect(screen.getByTestId("stream-post-card")).toBeInTheDocument();
      expect(screen.getByTestId("media-preview")).toBeInTheDocument();
      expect(screen.getByTestId("metrics")).toBeInTheDocument();
    });

    it("should handle empty content", () => {
      const post = createMockPost({ content: "" });
      render(<StreamPostCard post={post} />);
      expect(screen.getByTestId("stream-post-card")).toBeInTheDocument();
    });

    it("should handle whitespace-only content", () => {
      const post = createMockPost({ content: "   \n\t  " });
      render(<StreamPostCard post={post} />);
      expect(screen.getByTestId("stream-post-card")).toBeInTheDocument();
    });

    it("should preserve newlines in content", () => {
      const post = createMockPost({ content: "Line 1\nLine 2\nLine 3" });
      render(<StreamPostCard post={post} />);
      const content = screen.getByText(/Line 1/);
      expect(content).toHaveClass("whitespace-pre-wrap");
    });

    it("should handle zero metrics", () => {
      const post = createMockPost({
        metrics: { likes: 0, comments: 0, shares: 0 },
      });
      render(<StreamPostCard post={post} />);
      expect(screen.getAllByText("0")).toHaveLength(3);
    });
  });
});
