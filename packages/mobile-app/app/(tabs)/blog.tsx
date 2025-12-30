/**
 * Blog Tab Screen
 * Displays a list of blog posts with pull-to-refresh and loading states
 */

import type { BlogPost } from "@/services/api/blog";
import { BookOpen, RefreshCw } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Spinner, Stack, Text, XStack, YStack } from "tamagui";

import { BlogCard } from "@/components/BlogCard";
import { getBlogPosts } from "@/services/api/blog";

// ============================================================================
// Types
// ============================================================================

interface BlogPostItem extends BlogPost {
  key: string;
}

// ============================================================================
// Skeleton Component
// ============================================================================

function BlogCardSkeleton() {
  return (
    <Stack
      backgroundColor="$gray2"
      borderRadius="$4"
      overflow="hidden"
      borderWidth={1}
      borderColor="$gray4"
    >
      {/* Image skeleton */}
      <Stack height={180} backgroundColor="$gray4" />

      {/* Content skeleton */}
      <YStack padding="$3" gap="$2">
        {/* Title skeleton */}
        <Stack
          height={24}
          width="80%"
          backgroundColor="$gray4"
          borderRadius="$2"
        />
        <Stack
          height={24}
          width="60%"
          backgroundColor="$gray4"
          borderRadius="$2"
        />

        {/* Excerpt skeleton */}
        <Stack
          height={16}
          width="100%"
          backgroundColor="$gray4"
          borderRadius="$2"
          marginTop="$2"
        />
        <Stack
          height={16}
          width="90%"
          backgroundColor="$gray4"
          borderRadius="$2"
        />
        <Stack
          height={16}
          width="70%"
          backgroundColor="$gray4"
          borderRadius="$2"
        />

        {/* Meta skeleton */}
        <XStack gap="$3" marginTop="$2">
          <Stack
            height={14}
            width={80}
            backgroundColor="$gray4"
            borderRadius="$2"
          />
          <Stack
            height={14}
            width={60}
            backgroundColor="$gray4"
            borderRadius="$2"
          />
        </XStack>
      </YStack>
    </Stack>
  );
}

function LoadingSkeleton() {
  return (
    <YStack gap="$4" padding="$4" testID="blog-loading-skeleton">
      <BlogCardSkeleton />
      <BlogCardSkeleton />
      <BlogCardSkeleton />
    </YStack>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState() {
  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      padding="$6"
      gap="$4"
      testID="blog-empty-state"
    >
      <Stack
        backgroundColor="$gray3"
        padding="$4"
        borderRadius="$6"
      >
        <BookOpen size={48} color="$gray10" />
      </Stack>
      <Text fontSize="$6" fontWeight="600" color="$gray12" textAlign="center">
        No Blog Posts Yet
      </Text>
      <Text fontSize="$4" color="$gray10" textAlign="center" maxWidth={280}>
        Check back soon for the latest news, tutorials, and updates from Spike Land.
      </Text>
    </YStack>
  );
}

// ============================================================================
// Error State Component
// ============================================================================

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      padding="$6"
      gap="$4"
      testID="blog-error-state"
    >
      <Stack
        backgroundColor="$red3"
        padding="$4"
        borderRadius="$6"
      >
        <RefreshCw size={48} color="$red10" />
      </Stack>
      <Text fontSize="$6" fontWeight="600" color="$gray12" textAlign="center">
        Failed to Load Posts
      </Text>
      <Text fontSize="$4" color="$gray10" textAlign="center" maxWidth={280}>
        {error}
      </Text>
      <XStack
        backgroundColor="$cyan9"
        paddingHorizontal="$4"
        paddingVertical="$2"
        borderRadius="$3"
        pressStyle={{ opacity: 0.8 }}
        onPress={onRetry}
        cursor="pointer"
      >
        <Text color="white" fontWeight="600">
          Try Again
        </Text>
      </XStack>
    </YStack>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function BlogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch blog posts
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["blogPosts"],
    queryFn: async () => {
      const response = await getBlogPosts();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
  });

  // Handle post press - navigate to detail page
  const handlePostPress = useCallback(
    (post: BlogPost) => {
      router.push({
        pathname: "/blog/[slug]",
        params: { slug: post.slug },
      });
    },
    [router],
  );

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  // Handle retry
  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  // Prepare data for FlatList
  const posts: BlogPostItem[] = (data?.posts || []).map((post) => ({
    ...post,
    key: post.slug,
  }));

  // Render list item
  const renderItem = useCallback(
    ({ item }: { item: BlogPostItem; }) => (
      <YStack paddingHorizontal="$4" paddingBottom="$4">
        <BlogCard
          post={item}
          onPress={handlePostPress}
          testID={`blog-card-${item.slug}`}
        />
      </YStack>
    ),
    [handlePostPress],
  );

  // Key extractor
  const keyExtractor = useCallback((item: BlogPostItem) => item.key, []);

  // List header component
  const ListHeaderComponent = useCallback(
    () => (
      <YStack paddingHorizontal="$4" paddingTop="$2" paddingBottom="$4">
        <Text fontSize="$3" color="$gray10">
          Latest news, tutorials, and updates
        </Text>
      </YStack>
    ),
    [],
  );

  // Render loading state
  if (isLoading && !isRefreshing) {
    return (
      <YStack flex={1} backgroundColor="$background">
        <XStack
          paddingTop={insets.top}
          paddingHorizontal="$4"
          paddingBottom="$2"
          backgroundColor="$background"
          alignItems="center"
          borderBottomWidth={StyleSheet.hairlineWidth}
          borderBottomColor="$borderColor"
        >
          <Text fontSize="$7" fontWeight="700">
            Blog
          </Text>
        </XStack>
        <LoadingSkeleton />
      </YStack>
    );
  }

  // Render error state
  if (error && !isRefreshing) {
    return (
      <YStack flex={1} backgroundColor="$background">
        <XStack
          paddingTop={insets.top}
          paddingHorizontal="$4"
          paddingBottom="$2"
          backgroundColor="$background"
          alignItems="center"
          borderBottomWidth={StyleSheet.hairlineWidth}
          borderBottomColor="$borderColor"
        >
          <Text fontSize="$7" fontWeight="700">
            Blog
          </Text>
        </XStack>
        <ErrorState
          error={error instanceof Error ? error.message : "An error occurred"}
          onRetry={handleRetry}
        />
      </YStack>
    );
  }

  // Render empty state
  if (posts.length === 0 && !isLoading) {
    return (
      <YStack flex={1} backgroundColor="$background">
        <XStack
          paddingTop={insets.top}
          paddingHorizontal="$4"
          paddingBottom="$2"
          backgroundColor="$background"
          alignItems="center"
          borderBottomWidth={StyleSheet.hairlineWidth}
          borderBottomColor="$borderColor"
        >
          <Text fontSize="$7" fontWeight="700">
            Blog
          </Text>
        </XStack>
        <EmptyState />
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background" testID="blog-screen">
      {/* Header */}
      <XStack
        paddingTop={insets.top}
        paddingHorizontal="$4"
        paddingBottom="$2"
        backgroundColor="$background"
        alignItems="center"
        borderBottomWidth={StyleSheet.hairlineWidth}
        borderBottomColor="$borderColor"
      >
        <Text fontSize="$7" fontWeight="700">
          Blog
        </Text>
      </XStack>

      {/* Blog Post List */}
      <FlatList
        data={posts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#00bcd4"
          />
        }
        ListFooterComponent={isLoading
          ? (
            <YStack padding="$4" alignItems="center">
              <Spinner size="small" color="$cyan9" />
            </YStack>
          )
          : null}
        testID="blog-list"
      />
    </YStack>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 100,
  },
});
