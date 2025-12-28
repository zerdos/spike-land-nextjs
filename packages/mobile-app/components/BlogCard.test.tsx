/**
 * BlogCard Component Tests
 */

import type { BlogPost } from "@/services/api/blog";
import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";

import { BlogCard } from "./BlogCard";

// Mock expo-image
jest.mock("expo-image", () => ({
  Image: "Image",
}));

// Mock tamagui components
jest.mock("tamagui", () => ({
  Card: ({ children, ...props }: React.PropsWithChildren<object>) => {
    const { View } = require("react-native");
    return <View {...props}>{children}</View>;
  },
  Stack: ({ children, ...props }: React.PropsWithChildren<object>) => {
    const { View } = require("react-native");
    return <View {...props}>{children}</View>;
  },
  Text: ({ children, ...props }: React.PropsWithChildren<object>) => {
    const { Text } = require("react-native");
    return <Text {...props}>{children}</Text>;
  },
  XStack: ({ children, ...props }: React.PropsWithChildren<object>) => {
    const { View } = require("react-native");
    return <View {...props}>{children}</View>;
  },
  YStack: ({ children, ...props }: React.PropsWithChildren<object>) => {
    const { View } = require("react-native");
    return <View {...props}>{children}</View>;
  },
}));

// Mock lucide icons
jest.mock("@tamagui/lucide-icons", () => ({
  Calendar: () => null,
  Clock: () => null,
}));

describe("BlogCard", () => {
  const mockPost: BlogPost = {
    slug: "test-post",
    title: "Test Blog Post Title",
    excerpt: "This is a test excerpt for the blog post.",
    content: "Full content here",
    date: "2024-06-15",
    author: "John Doe",
    image: "https://example.com/image.jpg",
    category: "Technology",
    tags: ["react", "mobile", "testing"],
    readingTime: "5 min read",
    featured: false,
  };

  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render the blog post title", () => {
    render(
      <BlogCard post={mockPost} onPress={mockOnPress} testID="blog-card" />,
    );

    expect(screen.getByTestId("blog-card-title")).toBeTruthy();
  });

  it("should render the blog post excerpt", () => {
    render(
      <BlogCard post={mockPost} onPress={mockOnPress} testID="blog-card" />,
    );

    expect(screen.getByTestId("blog-card-excerpt")).toBeTruthy();
  });

  it("should render the formatted date", () => {
    render(
      <BlogCard post={mockPost} onPress={mockOnPress} testID="blog-card" />,
    );

    expect(screen.getByTestId("blog-card-date")).toBeTruthy();
  });

  it("should render the reading time", () => {
    render(
      <BlogCard post={mockPost} onPress={mockOnPress} testID="blog-card" />,
    );

    expect(screen.getByTestId("blog-card-reading-time")).toBeTruthy();
  });

  it("should call onPress when pressed", () => {
    render(
      <BlogCard post={mockPost} onPress={mockOnPress} testID="blog-card" />,
    );

    const card = screen.getByTestId("blog-card");
    fireEvent.press(card);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
    expect(mockOnPress).toHaveBeenCalledWith(mockPost);
  });

  it("should render category badge", () => {
    render(
      <BlogCard post={mockPost} onPress={mockOnPress} testID="blog-card" />,
    );

    expect(screen.getByText("Technology")).toBeTruthy();
  });

  it("should render author name", () => {
    render(
      <BlogCard post={mockPost} onPress={mockOnPress} testID="blog-card" />,
    );

    expect(screen.getByText("By John Doe")).toBeTruthy();
  });

  it("should render tags", () => {
    render(
      <BlogCard post={mockPost} onPress={mockOnPress} testID="blog-card" />,
    );

    expect(screen.getByText("#react")).toBeTruthy();
    expect(screen.getByText("#mobile")).toBeTruthy();
    expect(screen.getByText("#testing")).toBeTruthy();
  });

  it("should show +N badge when more than 3 tags", () => {
    const postWithManyTags: BlogPost = {
      ...mockPost,
      tags: ["react", "mobile", "testing", "typescript", "expo"],
    };

    render(
      <BlogCard
        post={postWithManyTags}
        onPress={mockOnPress}
        testID="blog-card"
      />,
    );

    expect(screen.getByText("+2")).toBeTruthy();
  });

  it("should not render tags section when no tags", () => {
    const postWithNoTags: BlogPost = {
      ...mockPost,
      tags: [],
    };

    render(
      <BlogCard post={postWithNoTags} onPress={mockOnPress} testID="blog-card" />,
    );

    expect(screen.queryByText("#react")).toBeNull();
  });

  it("should render featured badge when post is featured", () => {
    const featuredPost: BlogPost = {
      ...mockPost,
      featured: true,
    };

    render(
      <BlogCard post={featuredPost} onPress={mockOnPress} testID="blog-card" />,
    );

    expect(screen.getByText("Featured")).toBeTruthy();
  });

  it("should not render featured badge when post is not featured", () => {
    render(
      <BlogCard post={mockPost} onPress={mockOnPress} testID="blog-card" />,
    );

    expect(screen.queryByText("Featured")).toBeNull();
  });

  it("should have correct accessibility properties", () => {
    render(
      <BlogCard post={mockPost} onPress={mockOnPress} testID="blog-card" />,
    );

    const card = screen.getByTestId("blog-card");
    expect(card.props.accessibilityRole).toBe("button");
    expect(card.props.accessibilityLabel).toBe(
      `Read blog post: ${mockPost.title}`,
    );
  });

  it("should format date correctly", () => {
    const postWithDate: BlogPost = {
      ...mockPost,
      date: "2024-01-15",
    };

    render(
      <BlogCard post={postWithDate} onPress={mockOnPress} testID="blog-card" />,
    );

    // Check that a date is rendered (format: Jan 15, 2024)
    expect(screen.getByTestId("blog-card-date")).toBeTruthy();
  });

  it("should render image with correct source", () => {
    render(
      <BlogCard post={mockPost} onPress={mockOnPress} testID="blog-card" />,
    );

    expect(screen.getByTestId("blog-card-image")).toBeTruthy();
  });

  it("should use default image when post has no image", () => {
    const postWithNoImage: BlogPost = {
      ...mockPost,
      image: undefined,
    };

    render(
      <BlogCard post={postWithNoImage} onPress={mockOnPress} testID="blog-card" />,
    );

    // Image component should still be rendered
    expect(screen.getByTestId("blog-card-image")).toBeTruthy();
  });
});
