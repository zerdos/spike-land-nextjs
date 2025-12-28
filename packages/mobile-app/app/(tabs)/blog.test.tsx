/**
 * Blog Screen Tests
 */

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

// Mock modules before importing the component
jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
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

jest.mock("tamagui", () => {
  const { View, Text: RNText, ScrollView } = require("react-native");
  return {
    Spinner: () => <View testID="spinner" />,
    Stack: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <View {...props}>{children}</View>
    ),
    Text: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <RNText {...props}>{children}</RNText>
    ),
    XStack: (
      { children, onPress, ...props }: React.PropsWithChildren<{ onPress?: () => void; }>,
    ) => (
      <View {...props} onTouchEnd={onPress}>
        {children}
      </View>
    ),
    YStack: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <View {...props}>{children}</View>
    ),
    Card: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <View {...props}>{children}</View>
    ),
    ScrollView: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <ScrollView {...props}>{children}</ScrollView>
    ),
  };
});

jest.mock("@tamagui/lucide-icons", () => ({
  BookOpen: () => null,
  Calendar: () => null,
  Clock: () => null,
  RefreshCw: () => null,
}));

jest.mock("@/services/api/blog", () => ({
  getBlogPosts: jest.fn(),
}));

jest.mock("@/components/BlogCard", () => ({
  BlogCard: (
    { post, onPress, testID }: { post: { title: string; }; onPress: () => void; testID: string; },
  ) => {
    const { View, Text, Pressable } = require("react-native");
    return (
      <Pressable testID={testID} onPress={onPress}>
        <View>
          <Text>{post.title}</Text>
        </View>
      </Pressable>
    );
  },
}));

import BlogScreen from "./blog";

const mockRouter = {
  push: jest.fn(),
};

const mockUseRouter = useRouter as jest.Mock;
const mockUseQuery = useQuery as jest.Mock;

describe("BlogScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter);
  });

  describe("Loading State", () => {
    it("should render loading skeleton when loading", () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      render(<BlogScreen />);

      expect(screen.getByTestId("blog-loading-skeleton")).toBeTruthy();
    });

    it("should render Blog header when loading", () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      render(<BlogScreen />);

      expect(screen.getByText("Blog")).toBeTruthy();
    });
  });

  describe("Error State", () => {
    it("should render error state when there is an error", () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error("Network error"),
        refetch: jest.fn(),
      });

      render(<BlogScreen />);

      expect(screen.getByTestId("blog-error-state")).toBeTruthy();
      expect(screen.getByText("Failed to Load Posts")).toBeTruthy();
      expect(screen.getByText("Network error")).toBeTruthy();
    });

    it("should call refetch when Try Again is pressed", () => {
      const mockRefetch = jest.fn();
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error("Network error"),
        refetch: mockRefetch,
      });

      render(<BlogScreen />);

      const retryButton = screen.getByText("Try Again");
      fireEvent(retryButton.parent!, "touchEnd");

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe("Empty State", () => {
    it("should render empty state when no posts", () => {
      mockUseQuery.mockReturnValue({
        data: { posts: [] },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<BlogScreen />);

      expect(screen.getByTestId("blog-empty-state")).toBeTruthy();
      expect(screen.getByText("No Blog Posts Yet")).toBeTruthy();
    });
  });

  describe("Posts List", () => {
    const mockPosts = [
      {
        slug: "post-1",
        title: "First Post",
        excerpt: "First excerpt",
        content: "Content",
        date: "2024-01-01",
        author: "Author 1",
        category: "Tech",
        tags: ["react"],
        readingTime: "5 min read",
      },
      {
        slug: "post-2",
        title: "Second Post",
        excerpt: "Second excerpt",
        content: "Content",
        date: "2024-01-02",
        author: "Author 2",
        category: "News",
        tags: ["mobile"],
        readingTime: "3 min read",
      },
    ];

    it("should render blog posts list", () => {
      mockUseQuery.mockReturnValue({
        data: { posts: mockPosts },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<BlogScreen />);

      expect(screen.getByTestId("blog-screen")).toBeTruthy();
      expect(screen.getByTestId("blog-list")).toBeTruthy();
    });

    it("should render blog cards for each post", () => {
      mockUseQuery.mockReturnValue({
        data: { posts: mockPosts },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<BlogScreen />);

      expect(screen.getByTestId("blog-card-post-1")).toBeTruthy();
      expect(screen.getByTestId("blog-card-post-2")).toBeTruthy();
    });

    it("should navigate to post detail when card is pressed", () => {
      mockUseQuery.mockReturnValue({
        data: { posts: mockPosts },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<BlogScreen />);

      const firstCard = screen.getByTestId("blog-card-post-1");
      fireEvent.press(firstCard);

      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: "/blog/[slug]",
        params: { slug: "post-1" },
      });
    });

    it("should render list header with subtitle", () => {
      mockUseQuery.mockReturnValue({
        data: { posts: mockPosts },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<BlogScreen />);

      expect(
        screen.getByText("Latest news, tutorials, and updates"),
      ).toBeTruthy();
    });
  });

  describe("Pull to Refresh", () => {
    it("should call refetch on refresh", async () => {
      const mockRefetch = jest.fn().mockResolvedValue(undefined);
      mockUseQuery.mockReturnValue({
        data: {
          posts: [
            {
              slug: "post-1",
              title: "Test Post",
              excerpt: "Test",
              content: "Content",
              date: "2024-01-01",
              author: "Author",
              category: "Tech",
              tags: [],
              readingTime: "5 min",
            },
          ],
        },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<BlogScreen />);

      const list = screen.getByTestId("blog-list");
      const refreshControl = list.props.refreshControl;

      // Simulate refresh
      await refreshControl.props.onRefresh();

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });
  });

  describe("Query Configuration", () => {
    it("should use correct query key", () => {
      mockUseQuery.mockReturnValue({
        data: { posts: [] },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<BlogScreen />);

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ["blogPosts"],
        }),
      );
    });
  });
});
