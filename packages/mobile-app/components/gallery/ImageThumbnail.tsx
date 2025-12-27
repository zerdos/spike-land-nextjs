/**
 * ImageThumbnail Component
 * Grid item displaying an image with selection support
 */

import type { EnhancedImage } from "@spike-npm-land/shared";
import { Check, Circle } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import React, { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { Stack, XStack } from "tamagui";

// ============================================================================
// Types
// ============================================================================

interface ImageThumbnailProps {
  image: EnhancedImage;
  isSelected: boolean;
  isSelectionMode: boolean;
  onPress: (image: EnhancedImage) => void;
  onLongPress: (image: EnhancedImage) => void;
  columns?: number;
  spacing?: number;
}

// ============================================================================
// Component
// ============================================================================

export function ImageThumbnail({
  image,
  isSelected,
  isSelectionMode,
  onPress,
  onLongPress,
  columns = 3,
  spacing = 2,
}: ImageThumbnailProps) {
  const { width: screenWidth } = useWindowDimensions();

  // Calculate item size based on columns and spacing
  const itemSize = useMemo(() => {
    const totalSpacing = spacing * (columns + 1);
    return (screenWidth - totalSpacing) / columns;
  }, [screenWidth, columns, spacing]);

  // Calculate aspect ratio for masonry effect
  const aspectRatio = useMemo(() => {
    if (image.originalWidth && image.originalHeight) {
      return image.originalWidth / image.originalHeight;
    }
    return 1;
  }, [image.originalWidth, image.originalHeight]);

  // Calculate height based on aspect ratio (for masonry layout)
  const itemHeight = useMemo(() => {
    // Clamp aspect ratio to avoid extreme heights
    const clampedRatio = Math.max(0.5, Math.min(2, aspectRatio));
    return itemSize / clampedRatio;
  }, [itemSize, aspectRatio]);

  const handlePress = useCallback(() => {
    onPress(image);
  }, [image, onPress]);

  const handleLongPress = useCallback(() => {
    onLongPress(image);
  }, [image, onLongPress]);

  // Blurhash for placeholder
  const blurhash = "L6Pj0^jE.AyE_3t7t7R**0o#DgR4";

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      style={[
        styles.container,
        {
          width: itemSize,
          height: itemHeight,
          margin: spacing / 2,
        },
      ]}
    >
      <Stack
        width="100%"
        height="100%"
        borderRadius="$2"
        overflow="hidden"
        backgroundColor="$gray4"
      >
        <Image
          source={{ uri: image.originalUrl }}
          style={styles.image}
          contentFit="cover"
          placeholder={blurhash}
          transition={200}
          cachePolicy="memory-disk"
        />

        {/* Selection overlay */}
        {isSelectionMode && (
          <Stack
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor={isSelected ? "$blue5" : "transparent"}
            opacity={isSelected ? 0.3 : 0}
          />
        )}

        {/* Selection indicator */}
        {isSelectionMode && (
          <XStack
            position="absolute"
            top="$2"
            right="$2"
            width={24}
            height={24}
            borderRadius={12}
            backgroundColor={isSelected ? "$blue10" : "$gray1"}
            borderWidth={2}
            borderColor={isSelected ? "$blue10" : "$gray8"}
            alignItems="center"
            justifyContent="center"
          >
            {isSelected ? <Check size={14} color="white" /> : <Circle size={14} color="$gray8" />}
          </XStack>
        )}

        {/* Selected border */}
        {isSelected && (
          <Stack
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            borderWidth={3}
            borderColor="$blue10"
            borderRadius="$2"
          />
        )}
      </Stack>
    </Pressable>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
