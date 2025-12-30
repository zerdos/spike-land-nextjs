/**
 * Comparison Page
 *
 * Displays image comparison slider and before/after views.
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { borderRadius, colors, fontSize, spacing } from "@/constants/theme";

export default function ComparisonPage() {
  const [viewMode, setViewMode] = useState<
    "slider" | "side-by-side" | "overlay"
  >("slider");
  const sliderPosition = useSharedValue(0.5);

  const leftImageStyle = useAnimatedStyle(() => ({
    width: `${sliderPosition.value * 100}%`,
  }));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Comparison</Text>
        <Text style={styles.subtitle}>
          Image comparison slider, comparison view toggle
        </Text>
      </View>

      {/* View Mode Toggle */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>View Modes</Text>
        <Text style={styles.sectionDescription}>
          Different ways to compare before and after images.
        </Text>

        <View style={styles.toggleContainer}>
          <Pressable
            style={[
              styles.toggleButton,
              viewMode === "slider" && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode("slider")}
          >
            <Ionicons
              name="swap-horizontal"
              size={18}
              color={viewMode === "slider"
                ? colors.primary
                : colors.mutedForeground}
            />
            <Text
              style={[
                styles.toggleText,
                viewMode === "slider" && styles.toggleTextActive,
              ]}
            >
              Slider
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.toggleButton,
              viewMode === "side-by-side" && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode("side-by-side")}
          >
            <Ionicons
              name="albums"
              size={18}
              color={viewMode === "side-by-side"
                ? colors.primary
                : colors.mutedForeground}
            />
            <Text
              style={[
                styles.toggleText,
                viewMode === "side-by-side" && styles.toggleTextActive,
              ]}
            >
              Side by Side
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.toggleButton,
              viewMode === "overlay" && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode("overlay")}
          >
            <Ionicons
              name="layers"
              size={18}
              color={viewMode === "overlay"
                ? colors.primary
                : colors.mutedForeground}
            />
            <Text
              style={[
                styles.toggleText,
                viewMode === "overlay" && styles.toggleTextActive,
              ]}
            >
              Overlay
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Comparison Slider */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Before/After Slider</Text>
        <Text style={styles.sectionDescription}>
          Drag the slider to compare original and enhanced images.
        </Text>

        <View style={styles.comparisonContainer}>
          {/* After Image (Background) */}
          <View style={styles.imageContainer}>
            <View style={[styles.imagePlaceholder, styles.afterImage]}>
              <Ionicons name="sparkles" size={32} color={colors.primary} />
              <Text style={styles.imageLabel}>Enhanced</Text>
            </View>
          </View>

          {/* Before Image (Foreground with clip) */}
          <Animated.View style={[styles.beforeImageClip, leftImageStyle]}>
            <View style={styles.imageContainer}>
              <View style={[styles.imagePlaceholder, styles.beforeImage]}>
                <Ionicons
                  name="image"
                  size={32}
                  color={colors.mutedForeground}
                />
                <Text style={styles.imageLabel}>Original</Text>
              </View>
            </View>
          </Animated.View>

          {/* Slider Handle */}
          <View style={styles.sliderHandle}>
            <View style={styles.sliderLine} />
            <View style={styles.sliderThumb}>
              <Ionicons
                name="swap-horizontal"
                size={20}
                color={colors.foreground}
              />
            </View>
            <View style={styles.sliderLine} />
          </View>
        </View>

        <View style={styles.sliderControls}>
          <Pressable
            style={styles.sliderButton}
            onPress={() => {
              sliderPosition.value = withSpring(0.25);
            }}
          >
            <Text style={styles.sliderButtonText}>25%</Text>
          </Pressable>
          <Pressable
            style={styles.sliderButton}
            onPress={() => {
              sliderPosition.value = withSpring(0.5);
            }}
          >
            <Text style={styles.sliderButtonText}>50%</Text>
          </Pressable>
          <Pressable
            style={styles.sliderButton}
            onPress={() => {
              sliderPosition.value = withSpring(0.75);
            }}
          >
            <Text style={styles.sliderButtonText}>75%</Text>
          </Pressable>
        </View>
      </View>

      {/* Side by Side View */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Side by Side</Text>
        <Text style={styles.sectionDescription}>
          View original and enhanced images next to each other.
        </Text>

        <View style={styles.sideBySideContainer}>
          <View style={styles.sideBySideImage}>
            <View style={[styles.imagePlaceholder, styles.beforeImage]}>
              <Ionicons name="image" size={24} color={colors.mutedForeground} />
            </View>
            <View style={styles.imageTag}>
              <Text style={styles.imageTagText}>Before</Text>
            </View>
          </View>
          <View style={styles.sideBySideImage}>
            <View style={[styles.imagePlaceholder, styles.afterImage]}>
              <Ionicons name="sparkles" size={24} color={colors.primary} />
            </View>
            <View style={[styles.imageTag, styles.imageTagAfter]}>
              <Text style={styles.imageTagText}>After</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Comparison Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Enhancement Stats</Text>
        <Text style={styles.sectionDescription}>
          Metrics showing the improvement from enhancement.
        </Text>

        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Resolution</Text>
            <View style={styles.statValues}>
              <Text style={styles.statBefore}>1024x1024</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.primary} />
              <Text style={styles.statAfter}>4096x4096</Text>
            </View>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Quality Score</Text>
            <View style={styles.statValues}>
              <Text style={styles.statBefore}>72%</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.primary} />
              <Text style={styles.statAfter}>98%</Text>
            </View>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Noise Level</Text>
            <View style={styles.statValues}>
              <Text style={styles.statBefore}>High</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.primary} />
              <Text style={styles.statAfter}>Low</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  header: {
    marginBottom: spacing[6],
  },
  title: {
    fontSize: fontSize["2xl"],
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    lineHeight: 24,
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.foreground,
    marginBottom: spacing[1],
  },
  sectionDescription: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing[3],
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[1],
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingVertical: spacing[2.5],
    borderRadius: borderRadius.md,
  },
  toggleButtonActive: {
    backgroundColor: colors.muted,
  },
  toggleText: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: colors.mutedForeground,
  },
  toggleTextActive: {
    color: colors.primary,
  },
  comparisonContainer: {
    height: 250,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    position: "relative",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing[2],
  },
  beforeImage: {
    backgroundColor: colors.muted,
  },
  afterImage: {
    backgroundColor: `${colors.primary}15`,
  },
  imageLabel: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: colors.mutedForeground,
  },
  beforeImageClip: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    overflow: "hidden",
  },
  sliderHandle: {
    position: "absolute",
    left: "50%",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.foreground,
    alignItems: "center",
    justifyContent: "center",
  },
  sliderLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.foreground,
  },
  sliderThumb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.foreground,
  },
  sliderControls: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing[2],
    marginTop: spacing[3],
  },
  sliderButton: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sliderButtonText: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: colors.foreground,
  },
  sideBySideContainer: {
    flexDirection: "row",
    gap: spacing[3],
  },
  sideBySideImage: {
    flex: 1,
    height: 150,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    position: "relative",
  },
  imageTag: {
    position: "absolute",
    top: spacing[2],
    left: spacing[2],
    backgroundColor: colors.background,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  imageTagAfter: {
    backgroundColor: colors.primary,
  },
  imageTagText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.foreground,
  },
  statsContainer: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing[3],
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statLabel: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: colors.mutedForeground,
  },
  statValues: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  statBefore: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  statAfter: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.primary,
  },
});
