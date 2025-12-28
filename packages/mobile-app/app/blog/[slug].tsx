/**
 * Blog Post Detail Screen
 * Displays full blog post content with header navigation and share functionality
 */

import type { BlogPost } from "@/services/api/blog";
import { ArrowLeft, Calendar, Clock, Share2, User } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useCallback } from "react";
import { Alert, Platform, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Spinner, Stack, Text, XStack, YStack } from "tamagui";

import { getBlogPost } from "@/services/api/blog";

// ============================================================================
// Types
// ============================================================================

// Route params type is not needed - we use a simpler approach

// ============================================================================
// Constants
// ============================================================================

const PLACEHOLDER_BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";
const SHARE_BASE_URL = "https://spike.land/blog";

// ============================================================================
// Loading State Component
// ============================================================================

function LoadingState() {
  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      testID="blog-detail-loading"
    >
      <Spinner size="large" color="$cyan9" />
      <Text marginTop="$4" color="$gray10">
        Loading post...
      </Text>
    </YStack>
  );
}

// ============================================================================
// Error State Component
// ============================================================================

interface ErrorStateProps {
  error: string;
  onBack: () => void;
}

function ErrorState({ error, onBack }: ErrorStateProps) {
  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      padding="$6"
      gap="$4"
      testID="blog-detail-error"
    >
      <Text fontSize="$6" fontWeight="600" color="$gray12" textAlign="center">
        Failed to Load Post
      </Text>
      <Text fontSize="$4" color="$gray10" textAlign="center" maxWidth={280}>
        {error}
      </Text>
      <Button onPress={onBack} backgroundColor="$cyan9">
        <Text color="white">Go Back</Text>
      </Button>
    </YStack>
  );
}

// ============================================================================
// Content Renderer Component
// ============================================================================

interface ContentRendererProps {
  content: string;
}

function ContentRenderer({ content }: ContentRendererProps) {
  // Simple markdown-like content rendering
  // In a production app, you might use a proper markdown renderer
  const paragraphs = content.split("\n\n").filter((p) => p.trim());

  return (
    <YStack gap="$3" testID="blog-content">
      {paragraphs.map((paragraph, index) => {
        const trimmed = paragraph.trim();

        // Handle headers
        if (trimmed.startsWith("### ")) {
          return (
            <Text
              key={index}
              fontSize="$5"
              fontWeight="700"
              color="$gray12"
              marginTop="$2"
            >
              {trimmed.replace("### ", "")}
            </Text>
          );
        }

        if (trimmed.startsWith("## ")) {
          return (
            <Text
              key={index}
              fontSize="$6"
              fontWeight="700"
              color="$gray12"
              marginTop="$3"
            >
              {trimmed.replace("## ", "")}
            </Text>
          );
        }

        if (trimmed.startsWith("# ")) {
          return (
            <Text
              key={index}
              fontSize="$7"
              fontWeight="700"
              color="$gray12"
              marginTop="$4"
            >
              {trimmed.replace("# ", "")}
            </Text>
          );
        }

        // Handle bullet lists
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const items = trimmed.split("\n");
          return (
            <YStack key={index} gap="$1" paddingLeft="$2">
              {items.map((item, itemIndex) => (
                <XStack key={itemIndex} gap="$2" alignItems="flex-start">
                  <Text color="$cyan9" fontSize="$4">
                    {"\u2022"}
                  </Text>
                  <Text
                    fontSize="$4"
                    color="$gray11"
                    lineHeight="$4"
                    flex={1}
                  >
                    {item.replace(/^[-*]\s/, "")}
                  </Text>
                </XStack>
              ))}
            </YStack>
          );
        }

        // Handle code blocks
        if (trimmed.startsWith("```")) {
          const codeContent = trimmed.replace(/```\w*\n?/g, "").replace(/```$/, "");
          return (
            <Stack
              key={index}
              backgroundColor="$gray3"
              padding="$3"
              borderRadius="$3"
              overflow="hidden"
            >
              <Text
                fontSize="$3"
                color="$gray11"
                style={{ fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }}
              >
                {codeContent}
              </Text>
            </Stack>
          );
        }

        // Handle blockquotes
        if (trimmed.startsWith("> ")) {
          return (
            <XStack
              key={index}
              borderLeftWidth={3}
              borderLeftColor="$cyan9"
              paddingLeft="$3"
              marginVertical="$2"
            >
              <Text fontSize="$4" color="$gray10" fontStyle="italic">
                {trimmed.replace(/^>\s?/gm, "")}
              </Text>
            </XStack>
          );
        }

        // Regular paragraph
        return (
          <Text
            key={index}
            fontSize="$4"
            color="$gray11"
            lineHeight="$5"
          >
            {trimmed}
          </Text>
        );
      })}
    </YStack>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function BlogDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const slug = typeof params.slug === "string" ? params.slug : "";

  // Fetch blog post
  const { data, isLoading, error } = useQuery({
    queryKey: ["blogPost", slug],
    queryFn: async () => {
      const response = await getBlogPost(slug);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: !!slug,
  });

  const post: BlogPost | undefined = data?.post;

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/blog");
    }
  }, [router]);

  // Handle share
  const handleShare = useCallback(async () => {
    if (!post) return;

    const shareUrl = `${SHARE_BASE_URL}/${post.slug}`;
    const message = `Check out "${post.title}" on Spike Land Blog: ${shareUrl}`;

    try {
      const isAvailable = await Sharing.isAvailableAsync();

      if (isAvailable) {
        // On mobile, use native share
        await Sharing.shareAsync(shareUrl, {
          dialogTitle: post.title,
        });
      } else if (Platform.OS === "web") {
        // On web, try navigator.share or fallback to clipboard
        if (navigator.share) {
          await navigator.share({
            title: post.title,
            text: post.excerpt,
            url: shareUrl,
          });
        } else {
          await navigator.clipboard.writeText(message);
          Alert.alert("Link Copied", "The blog post link has been copied to your clipboard.");
        }
      } else {
        Alert.alert("Share Not Available", "Sharing is not available on this device.");
      }
    } catch (err) {
      // User cancelled or error occurred
      if (err instanceof Error && err.message !== "Share cancelled") {
        console.error("Share error:", err);
      }
    }
  }, [post]);

  // Format date for display
  const formattedDate = post
    ? new Date(post.date).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    : "";

  // Render loading state
  if (isLoading) {
    return (
      <YStack flex={1} backgroundColor="$background">
        {/* Header */}
        <XStack
          paddingTop={insets.top}
          paddingHorizontal="$2"
          paddingBottom="$2"
          backgroundColor="$background"
          alignItems="center"
          justifyContent="space-between"
          borderBottomWidth={StyleSheet.hairlineWidth}
          borderBottomColor="$borderColor"
        >
          <Button
            size="$4"
            chromeless
            circular
            icon={ArrowLeft}
            onPress={handleBack}
            testID="back-button"
          />
          <Stack width={44} />
        </XStack>
        <LoadingState />
      </YStack>
    );
  }

  // Render error state
  if (error || !post) {
    return (
      <YStack flex={1} backgroundColor="$background">
        {/* Header */}
        <XStack
          paddingTop={insets.top}
          paddingHorizontal="$2"
          paddingBottom="$2"
          backgroundColor="$background"
          alignItems="center"
          justifyContent="space-between"
          borderBottomWidth={StyleSheet.hairlineWidth}
          borderBottomColor="$borderColor"
        >
          <Button
            size="$4"
            chromeless
            circular
            icon={ArrowLeft}
            onPress={handleBack}
            testID="back-button"
          />
          <Stack width={44} />
        </XStack>
        <ErrorState
          error={error instanceof Error
            ? error.message
            : "Post not found"}
          onBack={handleBack}
        />
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background" testID="blog-detail-screen">
      {/* Header */}
      <XStack
        paddingTop={insets.top}
        paddingHorizontal="$2"
        paddingBottom="$2"
        backgroundColor="$background"
        alignItems="center"
        justifyContent="space-between"
        borderBottomWidth={StyleSheet.hairlineWidth}
        borderBottomColor="$borderColor"
        zIndex={10}
      >
        <Button
          size="$4"
          chromeless
          circular
          icon={ArrowLeft}
          onPress={handleBack}
          testID="back-button"
        />
        <Button
          size="$4"
          chromeless
          circular
          icon={Share2}
          onPress={handleShare}
          testID="share-button"
        />
      </XStack>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Cover Image */}
        {post.image && (
          <Stack height={250} backgroundColor="$gray3">
            <Image
              source={{ uri: post.image }}
              style={styles.coverImage}
              contentFit="cover"
              placeholder={PLACEHOLDER_BLURHASH}
              transition={300}
              testID="cover-image"
            />
          </Stack>
        )}

        {/* Content */}
        <YStack padding="$4" gap="$4">
          {/* Category Badge */}
          <XStack>
            <XStack
              backgroundColor="$cyan9"
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$2"
            >
              <Text fontSize="$2" color="white" fontWeight="600">
                {post.category}
              </Text>
            </XStack>
          </XStack>

          {/* Title */}
          <Text
            fontSize="$8"
            fontWeight="700"
            color="$gray12"
            lineHeight="$8"
            testID="post-title"
          >
            {post.title}
          </Text>

          {/* Meta Info */}
          <YStack gap="$2">
            {/* Author */}
            <XStack gap="$2" alignItems="center">
              <User size={16} color="$gray10" />
              <Text fontSize="$3" color="$gray10">
                {post.author}
              </Text>
            </XStack>

            {/* Date and Reading Time */}
            <XStack gap="$4" alignItems="center">
              <XStack gap="$2" alignItems="center">
                <Calendar size={16} color="$gray10" />
                <Text fontSize="$3" color="$gray10" testID="post-date">
                  {formattedDate}
                </Text>
              </XStack>

              <XStack gap="$2" alignItems="center">
                <Clock size={16} color="$gray10" />
                <Text fontSize="$3" color="$gray10" testID="reading-time">
                  {post.readingTime}
                </Text>
              </XStack>
            </XStack>
          </YStack>

          {/* Divider */}
          <Stack height={1} backgroundColor="$gray4" marginVertical="$2" />

          {/* Post Content */}
          <ContentRenderer content={post.content} />

          {/* Tags */}
          {post.tags.length > 0 && (
            <YStack gap="$2" marginTop="$4">
              <Text fontSize="$3" color="$gray10" fontWeight="600">
                Tags
              </Text>
              <XStack gap="$2" flexWrap="wrap">
                {post.tags.map((tag) => (
                  <XStack
                    key={tag}
                    backgroundColor="$gray3"
                    paddingHorizontal="$3"
                    paddingVertical="$1"
                    borderRadius="$3"
                  >
                    <Text fontSize="$2" color="$gray11">
                      #{tag}
                    </Text>
                  </XStack>
                ))}
              </XStack>
            </YStack>
          )}

          {/* Bottom padding for safe area */}
          <Stack height={insets.bottom + 20} />
        </YStack>
      </ScrollView>
    </YStack>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
});
