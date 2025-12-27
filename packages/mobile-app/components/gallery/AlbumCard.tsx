/**
 * AlbumCard Component
 * Preview card for displaying album information with cover image
 */

import type { Album, AlbumPrivacy } from "@spike-land/shared";
import { Globe, Link2, Lock } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import React, { useCallback, useMemo } from "react";
import { Pressable, StyleSheet } from "react-native";
import { Stack, Text, XStack, YStack } from "tamagui";

// ============================================================================
// Types
// ============================================================================

interface AlbumCardProps {
  album: Album;
  imageCount?: number;
  coverImageUrl?: string;
  onPress: (album: Album) => void;
  onLongPress?: (album: Album) => void;
}

// ============================================================================
// Helpers
// ============================================================================

function getPrivacyIcon(privacy: AlbumPrivacy) {
  switch (privacy) {
    case "PUBLIC":
      return <Globe size={14} color="$green10" />;
    case "UNLISTED":
      return <Link2 size={14} color="$yellow10" />;
    case "PRIVATE":
    default:
      return <Lock size={14} color="$gray10" />;
  }
}

function getPrivacyLabel(privacy: AlbumPrivacy): string {
  switch (privacy) {
    case "PUBLIC":
      return "Public";
    case "UNLISTED":
      return "Unlisted";
    case "PRIVATE":
    default:
      return "Private";
  }
}

// ============================================================================
// Component
// ============================================================================

export function AlbumCard({
  album,
  imageCount = 0,
  coverImageUrl,
  onPress,
  onLongPress,
}: AlbumCardProps) {
  const handlePress = useCallback(() => {
    onPress(album);
  }, [album, onPress]);

  const handleLongPress = useCallback(() => {
    onLongPress?.(album);
  }, [album, onLongPress]);

  // Format date
  const formattedDate = useMemo(() => {
    const date = new Date(album.createdAt);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [album.createdAt]);

  // Default blurhash for placeholder
  const blurhash = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      style={styles.container}
    >
      <Stack
        backgroundColor="$gray2"
        borderRadius="$4"
        overflow="hidden"
        borderWidth={1}
        borderColor="$gray4"
      >
        {/* Cover Image Area */}
        <Stack height={160} backgroundColor="$gray3">
          {coverImageUrl
            ? (
              <Image
                source={{ uri: coverImageUrl }}
                style={styles.coverImage}
                contentFit="cover"
                placeholder={blurhash}
                transition={200}
                cachePolicy="memory-disk"
              />
            )
            : (
              <Stack
                flex={1}
                alignItems="center"
                justifyContent="center"
                backgroundColor="$gray4"
              >
                <Text color="$gray10" fontSize="$4">
                  No Cover
                </Text>
              </Stack>
            )}

          {/* Privacy Badge */}
          <XStack
            position="absolute"
            top="$2"
            right="$2"
            backgroundColor="$background"
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$2"
            alignItems="center"
            gap="$1"
            opacity={0.9}
          >
            {getPrivacyIcon(album.privacy)}
            <Text fontSize="$1" color="$gray11">
              {getPrivacyLabel(album.privacy)}
            </Text>
          </XStack>

          {/* Image Count Badge */}
          <XStack
            position="absolute"
            bottom="$2"
            right="$2"
            backgroundColor="$background"
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$2"
            opacity={0.9}
          >
            <Text fontSize="$2" fontWeight="600" color="$gray12">
              {imageCount} {imageCount === 1 ? "image" : "images"}
            </Text>
          </XStack>
        </Stack>

        {/* Album Info */}
        <YStack padding="$3" gap="$1">
          <Text
            fontSize="$5"
            fontWeight="600"
            color="$gray12"
            numberOfLines={1}
          >
            {album.name}
          </Text>

          {album.description && (
            <Text
              fontSize="$3"
              color="$gray10"
              numberOfLines={2}
            >
              {album.description}
            </Text>
          )}

          <Text fontSize="$2" color="$gray9" marginTop="$1">
            Created {formattedDate}
          </Text>
        </YStack>
      </Stack>
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
