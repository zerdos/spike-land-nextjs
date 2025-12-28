/**
 * Blog Detail Screen Tests
 */

import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

// Mock modules
jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-image", () => ({
  Image: "Image",
}));

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock("tamagui", () => {
  const { View, Text: RNText, ScrollView, Pressable } = require("react-native");
  return {
    Spinner: ({ testID }: { testID?: string; }) => <View testID={testID || "spinner"} />,
    Stack: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <View {...props}>{children}</View>
    ),
    Text: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <RNText {...props}>{children}</RNText>
    ),
    XStack: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <View {...props}>{children}</View>
    ),
    YStack: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <View {...props}>{children}</View>
    ),
    Button: ({
      children,
      onPress,
      testID,
      icon: Icon,
    }: React.PropsWithChildren<{
      onPress?: () => void;
      testID?: string;
      icon?: React.ComponentType;
    }>) => (
      <Pressable testID={testID} onPress={onPress}>
        {Icon && <Icon />}
        {children}
      </Pressable>
    ),
    ScrollView: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <ScrollView {...props}>{children}</ScrollView>
    ),
  };
});

jest.mock("@tamagui/lucide-icons", () => ({
  ArrowLeft: () => null,
  Calendar: () => null,
  Clock: () => null,
  Share2: () => null,
  User: () => null,
}));

jest.mock("@/services/api/blog", () => ({
  getBlogPost: jest.fn(),
}));

import BlogDetailScreen from "@/app/blog/[slug]";

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  replace: jest.fn(),
  canGoBack: jest.fn(),
};

const mockUseRouter = useRouter as jest.Mock;
const mockUseLocalSearchParams = useLocalSearchParams as jest.Mock;
const mockUseQuery = useQuery as jest.Mock;
const mockSharing = Sharing as jest.Mocked<typeof Sharing>;

describe("BlogDetailScreen", () => {
  const mockPost = {
    slug: "test-post",
    title: "Test Blog Post Title",
    excerpt: "This is a test excerpt.",
    content: "This is the full content of the blog post.\n\nWith multiple paragraphs.",
    date: "2024-06-15",
    author: "John Doe",
    image: "https://example.com/image.jpg",
    category: "Technology",
    tags: ["react", "mobile", "testing"],
    readingTime: "5 min read",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter);
    mockUseLocalSearchParams.mockReturnValue({ slug: "test-post" });
    mockRouter.canGoBack.mockReturnValue(true);
  });

  describe("Loading State", () => {
    it("should render loading state", () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      render(<BlogDetailScreen />);

      expect(screen.getByTestId("blog-detail-loading")).toBeTruthy();
      expect(screen.getByText("Loading post...")).toBeTruthy();
    });

    it("should render back button during loading", () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      render(<BlogDetailScreen />);

      expect(screen.getByTestId("back-button")).toBeTruthy();
    });
  });

  describe("Error State", () => {
    it("should render error state when fetch fails", () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error("Network error"),
      });

      render(<BlogDetailScreen />);

      expect(screen.getByTestId("blog-detail-error")).toBeTruthy();
      expect(screen.getByText("Failed to Load Post")).toBeTruthy();
      expect(screen.getByText("Network error")).toBeTruthy();
    });

    it("should render error state when post not found", () => {
      mockUseQuery.mockReturnValue({
        data: { post: null },
        isLoading: false,
        error: null,
      });

      render(<BlogDetailScreen />);

      expect(screen.getByTestId("blog-detail-error")).toBeTruthy();
      expect(screen.getByText("Post not found")).toBeTruthy();
    });

    it("should navigate back when Go Back is pressed in error state", () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error("Error"),
      });

      render(<BlogDetailScreen />);

      const goBackButton = screen.getByText("Go Back");
      fireEvent.press(goBackButton);

      expect(mockRouter.back).toHaveBeenCalled();
    });
  });

  describe("Post Content", () => {
    it("should render post title", () => {
      mockUseQuery.mockReturnValue({
        data: { post: mockPost },
        isLoading: false,
        error: null,
      });

      render(<BlogDetailScreen />);

      expect(screen.getByTestId("post-title")).toBeTruthy();
      expect(screen.getByText("Test Blog Post Title")).toBeTruthy();
    });

    it("should render post category", () => {
      mockUseQuery.mockReturnValue({
        data: { post: mockPost },
        isLoading: false,
        error: null,
      });

      render(<BlogDetailScreen />);

      expect(screen.getByText("Technology")).toBeTruthy();
    });

    it("should render author name", () => {
      mockUseQuery.mockReturnValue({
        data: { post: mockPost },
        isLoading: false,
        error: null,
      });

      render(<BlogDetailScreen />);

      expect(screen.getByText("John Doe")).toBeTruthy();
    });

    it("should render reading time", () => {
      mockUseQuery.mockReturnValue({
        data: { post: mockPost },
        isLoading: false,
        error: null,
      });

      render(<BlogDetailScreen />);

      expect(screen.getByTestId("reading-time")).toBeTruthy();
    });

    it("should render formatted date", () => {
      mockUseQuery.mockReturnValue({
        data: { post: mockPost },
        isLoading: false,
        error: null,
      });

      render(<BlogDetailScreen />);

      expect(screen.getByTestId("post-date")).toBeTruthy();
    });

    it("should render post content", () => {
      mockUseQuery.mockReturnValue({
        data: { post: mockPost },
        isLoading: false,
        error: null,
      });

      render(<BlogDetailScreen />);

      expect(screen.getByTestId("blog-content")).toBeTruthy();
    });

    it("should render tags", () => {
      mockUseQuery.mockReturnValue({
        data: { post: mockPost },
        isLoading: false,
        error: null,
      });

      render(<BlogDetailScreen />);

      expect(screen.getByText("#react")).toBeTruthy();
      expect(screen.getByText("#mobile")).toBeTruthy();
      expect(screen.getByText("#testing")).toBeTruthy();
    });

    it("should not render tags section when no tags", () => {
      const postWithNoTags = { ...mockPost, tags: [] };
      mockUseQuery.mockReturnValue({
        data: { post: postWithNoTags },
        isLoading: false,
        error: null,
      });

      render(<BlogDetailScreen />);

      expect(screen.queryByText("Tags")).toBeNull();
    });

    it("should render cover image when available", () => {
      mockUseQuery.mockReturnValue({
        data: { post: mockPost },
        isLoading: false,
        error: null,
      });

      render(<BlogDetailScreen />);

      expect(screen.getByTestId("cover-image")).toBeTruthy();
    });

    it("should not render cover image when not available", () => {
      const postWithNoImage = { ...mockPost, image: undefined };
      mockUseQuery.mockReturnValue({
        data: { post: postWithNoImage },
        isLoading: false,
        error: null,
      });

      render(<BlogDetailScreen />);

      expect(screen.queryByTestId("cover-image")).toBeNull();
    });
  });

  describe("Navigation", () => {
    it("should navigate back when back button is pressed", () => {
      mockUseQuery.mockReturnValue({
        data: { post: mockPost },
        isLoading: false,
        error: null,
      });

      render(<BlogDetailScreen />);

      const backButton = screen.getByTestId("back-button");
      fireEvent.press(backButton);

      expect(mockRouter.back).toHaveBeenCalled();
    });

    it("should replace to blog tab when cannot go back", () => {
      mockRouter.canGoBack.mockReturnValue(false);
      mockUseQuery.mockReturnValue({
        data: { post: mockPost },
        isLoading: false,
        error: null,
      });

      render(<BlogDetailScreen />);

      const backButton = screen.getByTestId("back-button");
      fireEvent.press(backButton);

      expect(mockRouter.replace).toHaveBeenCalledWith("/(tabs)/blog");
    });
  });

  describe("Share Functionality", () => {
    it("should render share button", () => {
      mockUseQuery.mockReturnValue({
        data: { post: mockPost },
        isLoading: false,
        error: null,
      });

      render(<BlogDetailScreen />);

      expect(screen.getByTestId("share-button")).toBeTruthy();
    });

    it("should attempt to share when share button is pressed", async () => {
      mockSharing.isAvailableAsync.mockResolvedValue(true);
      mockSharing.shareAsync.mockResolvedValue(undefined);

      mockUseQuery.mockReturnValue({
        data: { post: mockPost },
        isLoading: false,
        error: null,
      });

      render(<BlogDetailScreen />);

      const shareButton = screen.getByTestId("share-button");
      fireEvent.press(shareButton);

      await waitFor(() => {
        expect(mockSharing.isAvailableAsync).toHaveBeenCalled();
      });
    });
  });

  describe("Content Rendering", () => {
    it("should render headers correctly", () => {
      const postWithHeaders = {
        ...mockPost,
        content: "# Main Header\n\n## Sub Header\n\n### Small Header\n\nRegular text",
      };
      mockUseQuery.mockReturnValue({
        data: { post: postWithHeaders },
        isLoading: false,
        error: null,
      });

      render(<BlogDetailScreen />);

      expect(screen.getByText("Main Header")).toBeTruthy();
      expect(screen.getByText("Sub Header")).toBeTruthy();
      expect(screen.getByText("Small Header")).toBeTruthy();
    });

    it("should render bullet lists", () => {
      const postWithList = {
        ...mockPost,
        content: "- Item 1\n- Item 2\n- Item 3",
      };
      mockUseQuery.mockReturnValue({
        data: { post: postWithList },
        isLoading: false,
        error: null,
      });

      render(<BlogDetailScreen />);

      expect(screen.getByText("Item 1")).toBeTruthy();
      expect(screen.getByText("Item 2")).toBeTruthy();
      expect(screen.getByText("Item 3")).toBeTruthy();
    });

    it("should render blockquotes", () => {
      const postWithQuote = {
        ...mockPost,
        content: "> This is a quote",
      };
      mockUseQuery.mockReturnValue({
        data: { post: postWithQuote },
        isLoading: false,
        error: null,
      });

      render(<BlogDetailScreen />);

      expect(screen.getByText("This is a quote")).toBeTruthy();
    });
  });

  describe("Query Configuration", () => {
    it("should use correct query key with slug", () => {
      mockUseQuery.mockReturnValue({
        data: { post: mockPost },
        isLoading: false,
        error: null,
      });

      render(<BlogDetailScreen />);

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ["blogPost", "test-post"],
          enabled: true,
        }),
      );
    });

    it("should disable query when slug is not available", () => {
      mockUseLocalSearchParams.mockReturnValue({});
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      render(<BlogDetailScreen />);

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        }),
      );
    });
  });
});
