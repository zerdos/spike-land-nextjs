/**
 * SplitPreview Component
 *
 * Displays before/after image comparison with a draggable slider.
 * Used in blog posts to showcase image enhancements.
 */

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";

import { borderRadius, colors, spacing } from "@/constants/theme";

export interface SplitPreviewProps {
  originalUrl: string;
  enhancedUrl: string;
  originalLabel?: string;
  enhancedLabel?: string;
}

const PLACEHOLDER_BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";

export function SplitPreview({
  originalUrl,
  enhancedUrl,
  originalLabel = "Before",
  enhancedLabel = "After",
}: SplitPreviewProps) {
  // Initialize to a reasonable default; onLayout will update with actual width
  const [containerWidth, setContainerWidth] = useState(300);
  const sliderPosition = useSharedValue(0.5);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      const newPosition = Math.max(0.1, Math.min(0.9, event.x / containerWidth));
      sliderPosition.value = newPosition;
    });

  const leftImageStyle = useAnimatedStyle(() => ({
    width: `${sliderPosition.value * 100}%`,
  }));

  const sliderStyle = useAnimatedStyle(() => ({
    left: `${sliderPosition.value * 100}%`,
  }));

  return (
    <View
      style={styles.container}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      testID="split-preview"
    >
      {/* Enhanced Image (Background) */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: enhancedUrl }}
          style={styles.image}
          contentFit="cover"
          placeholder={PLACEHOLDER_BLURHASH}
          transition={300}
        />
        <View style={[styles.label, styles.labelRight]}>
          <Ionicons name="sparkles" size={12} color={colors.primary} />
          <Text style={styles.labelText}>{enhancedLabel}</Text>
        </View>
      </View>

      {/* Original Image (Foreground with clip) */}
      <Animated.View style={[styles.beforeImageClip, leftImageStyle]}>
        <View style={[styles.imageContainer, { width: containerWidth }]}>
          <Image
            source={{ uri: originalUrl }}
            style={styles.image}
            contentFit="cover"
            placeholder={PLACEHOLDER_BLURHASH}
            transition={300}
          />
          <View style={[styles.label, styles.labelLeft]}>
            <Ionicons name="image-outline" size={12} color={colors.mutedForeground} />
            <Text style={styles.labelText}>{originalLabel}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Slider Handle */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.sliderContainer, sliderStyle]}>
          <View style={styles.sliderLine} />
          <View style={styles.sliderThumb}>
            <Ionicons name="swap-horizontal" size={16} color={colors.foreground} />
          </View>
          <View style={styles.sliderLine} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

/**
 * ImageComparisonSlider Component
 *
 * Alternative name for SplitPreview, used in some blog posts.
 */
export function ImageComparisonSlider(props: SplitPreviewProps) {
  return <SplitPreview {...props} />;
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: "100%",
    height: 250,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    marginVertical: spacing[3],
  },
  imageContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  beforeImageClip: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    overflow: "hidden",
  },
  label: {
    position: "absolute",
    bottom: spacing[2],
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  labelLeft: {
    left: spacing[2],
  },
  labelRight: {
    right: spacing[2],
  },
  labelText: {
    color: colors.foreground,
    fontSize: 11,
    fontWeight: "600",
  },
  sliderContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    alignItems: "center",
    transform: [{ translateX: -1 }],
  },
  sliderLine: {
    flex: 1,
    width: 2,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
  },
  sliderThumb: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
});
