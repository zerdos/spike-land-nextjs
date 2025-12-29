/**
 * BlogCard Component
 * Preview card for displaying blog post information
 */

import type { BlogPost } from "@/services/api/blog";
import { Calendar, Clock } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import React, { useCallback, useMemo } from "react";
import { Pressable, StyleSheet } from "react-native";
import { Card, Stack, Text, XStack, YStack } from "tamagui";

// ============================================================================
// Types
// ============================================================================

export interface BlogCardProps {
  post: BlogPost;
  onPress: (post: BlogPost) => void;
  testID?: string;
}

// ============================================================================
// Constants
// ============================================================================

const PLACEHOLDER_BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";
const DEFAULT_IMAGE = "https://spike.land/images/blog-placeholder.jpg";

// ============================================================================
// Component
// ============================================================================

export function BlogCard({ post, onPress, testID }: BlogCardProps) {
  const handlePress = useCallback(() => {
    onPress(post);
  }, [post, onPress]);

  // Format date for display
  const formattedDate = useMemo(() => {
    const date = new Date(post.date);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [post.date]);

  // Image source with fallback
  const imageSource = useMemo(() => {
    return post.image || DEFAULT_IMAGE;
  }, [post.image]);

  return (
    <Pressable
      onPress={handlePress}
      style={styles.container}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`Read blog post: ${post.title}`}
    >
      <Card
        elevate
        bordered
        backgroundColor="$gray2"
        borderRadius="$4"
        overflow="hidden"
      >
        {/* Cover Image */}
        <Stack height={180} backgroundColor="$gray3">
          <Image
            source={{ uri: imageSource }}
            style={styles.coverImage}
            contentFit="cover"
            placeholder={PLACEHOLDER_BLURHASH}
            transition={200}
            cachePolicy="memory-disk"
            testID={`${testID}-image`}
          />

          {/* Category Badge */}
          <XStack
            position="absolute"
            top="$2"
            left="$2"
            backgroundColor="$cyan9"
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$2"
          >
            <Text fontSize="$1" color="white" fontWeight="600">
              {post.category}
            </Text>
          </XStack>

          {/* Featured Badge */}
          {post.featured && (
            <XStack
              position="absolute"
              top="$2"
              right="$2"
              backgroundColor="$yellow9"
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$2"
            >
              <Text fontSize="$1" color="$gray12" fontWeight="600">
                Featured
              </Text>
            </XStack>
          )}
        </Stack>

        {/* Post Info */}
        <YStack padding="$3" gap="$2">
          {/* Title */}
          <Text
            fontSize="$5"
            fontWeight="700"
            color="$gray12"
            numberOfLines={2}
            testID={`${testID}-title`}
          >
            {post.title}
          </Text>

          {/* Excerpt */}
          <Text
            fontSize="$3"
            color="$gray10"
            numberOfLines={3}
            lineHeight="$3"
            testID={`${testID}-excerpt`}
          >
            {post.excerpt}
          </Text>

          {/* Meta Info */}
          <XStack
            gap="$3"
            marginTop="$1"
            alignItems="center"
            flexWrap="wrap"
          >
            {/* Date */}
            <XStack gap="$1" alignItems="center">
              <Calendar size={14} color="$gray9" />
              <Text fontSize="$2" color="$gray9" testID={`${testID}-date`}>
                {formattedDate}
              </Text>
            </XStack>

            {/* Reading Time */}
            <XStack gap="$1" alignItems="center">
              <Clock size={14} color="$gray9" />
              <Text fontSize="$2" color="$gray9" testID={`${testID}-reading-time`}>
                {post.readingTime}
              </Text>
            </XStack>
          </XStack>

          {/* Author */}
          <Text fontSize="$2" color="$gray10" marginTop="$1">
            By {post.author}
          </Text>

          {/* Tags */}
          {post.tags.length > 0 && (
            <XStack gap="$1" flexWrap="wrap" marginTop="$1">
              {post.tags.slice(0, 3).map((tag) => (
                <XStack
                  key={tag}
                  backgroundColor="$gray4"
                  paddingHorizontal="$2"
                  paddingVertical="$1"
                  borderRadius="$2"
                >
                  <Text fontSize="$1" color="$gray11">
                    #{tag}
                  </Text>
                </XStack>
              ))}
              {post.tags.length > 3 && (
                <XStack
                  backgroundColor="$gray4"
                  paddingHorizontal="$2"
                  paddingVertical="$1"
                  borderRadius="$2"
                >
                  <Text fontSize="$1" color="$gray11">
                    +{post.tags.length - 3}
                  </Text>
                </XStack>
              )}
            </XStack>
          )}
        </YStack>
      </Card>
    </Pressable>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
});
