/**
 * Loading Page
 *
 * Displays skeleton loaders, progress bars, and spinner animations.
 */

import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { borderRadius, colors, fontSize, spacing } from "@/constants/theme";

// Skeleton component with shimmer animation
function Skeleton(
  { width, height, style }: {
    width: number | string;
    height: number;
    style?: object;
  },
) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });

  return (
    <View
      style={[
        styles.skeleton,
        {
          width: typeof width === "number" ? width : undefined,
          flex: width === "100%" ? 1 : undefined,
          height,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          { transform: [{ translateX }] },
        ]}
      />
    </View>
  );
}

export default function LoadingPage() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Loading</Text>
        <Text style={styles.subtitle}>
          Skeleton loaders, progress bars, spinners/animations
        </Text>
      </View>

      {/* Spinners */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Spinners</Text>
        <Text style={styles.sectionDescription}>
          Activity indicators for indeterminate loading states.
        </Text>

        <View style={styles.spinnerCard}>
          <View style={styles.spinnerItem}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.spinnerLabel}>Small</Text>
          </View>
          <View style={styles.spinnerItem}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.spinnerLabel}>Large</Text>
          </View>
          <View style={styles.spinnerItem}>
            <ActivityIndicator size="large" color={colors.mutedForeground} />
            <Text style={styles.spinnerLabel}>Muted</Text>
          </View>
        </View>
      </View>

      {/* Progress Bars */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Progress Bars</Text>
        <Text style={styles.sectionDescription}>
          Determinate progress indicators with percentage.
        </Text>

        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Uploading...</Text>
            <Text style={styles.progressValue}>25%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: "25%" }]} />
          </View>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Processing...</Text>
            <Text style={styles.progressValue}>60%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: "60%" }]} />
          </View>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Complete</Text>
            <Text style={[styles.progressValue, { color: colors.success }]}>
              100%
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, {
                width: "100%",
                backgroundColor: colors.success,
              }]}
            />
          </View>
        </View>
      </View>

      {/* Skeleton Cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Skeleton Cards</Text>
        <Text style={styles.sectionDescription}>
          Placeholder content while data loads.
        </Text>

        <View style={styles.skeletonCard}>
          <View style={styles.skeletonHeader}>
            <Skeleton
              width={48}
              height={48}
              style={{ borderRadius: borderRadius.full }}
            />
            <View style={styles.skeletonHeaderText}>
              <Skeleton width={120} height={16} />
              <Skeleton width={80} height={12} />
            </View>
          </View>
          <Skeleton width="100%" height={16} />
          <Skeleton width="100%" height={16} />
          <Skeleton width="60%" height={16} />
        </View>

        <View style={styles.skeletonCard}>
          <Skeleton
            width="100%"
            height={180}
            style={{ borderRadius: borderRadius.lg }}
          />
          <Skeleton width="80%" height={20} />
          <Skeleton width="100%" height={14} />
          <Skeleton width="40%" height={14} />
        </View>
      </View>

      {/* Skeleton List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Skeleton List</Text>
        <Text style={styles.sectionDescription}>
          List item placeholders for tabular data.
        </Text>

        <View style={styles.skeletonList}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.skeletonListItem}>
              <Skeleton
                width={40}
                height={40}
                style={{ borderRadius: borderRadius.md }}
              />
              <View style={styles.skeletonListContent}>
                <Skeleton width="70%" height={14} />
                <Skeleton width="40%" height={12} />
              </View>
              <Skeleton
                width={60}
                height={28}
                style={{ borderRadius: borderRadius.md }}
              />
            </View>
          ))}
        </View>
      </View>

      {/* Circular Progress */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Circular Progress</Text>
        <Text style={styles.sectionDescription}>
          Radial progress indicators for compact spaces.
        </Text>

        <View style={styles.circularGrid}>
          <View style={styles.circularItem}>
            <View style={styles.circularProgress}>
              <View style={styles.circularTrack} />
              <View
                style={[styles.circularFill, {
                  transform: [{ rotate: "90deg" }],
                }]}
              />
              <View style={styles.circularInner}>
                <Text style={styles.circularValue}>25%</Text>
              </View>
            </View>
            <Text style={styles.circularLabel}>Starting</Text>
          </View>
          <View style={styles.circularItem}>
            <View style={styles.circularProgress}>
              <View style={styles.circularTrack} />
              <View
                style={[styles.circularFill, {
                  transform: [{ rotate: "180deg" }],
                }]}
              />
              <View style={styles.circularInner}>
                <Text style={styles.circularValue}>50%</Text>
              </View>
            </View>
            <Text style={styles.circularLabel}>Halfway</Text>
          </View>
          <View style={styles.circularItem}>
            <View style={styles.circularProgress}>
              <View style={styles.circularTrack} />
              <View style={[styles.circularFill, styles.circularComplete]} />
              <View style={styles.circularInner}>
                <Text style={[styles.circularValue, { color: colors.success }]}>
                  100%
                </Text>
              </View>
            </View>
            <Text style={styles.circularLabel}>Complete</Text>
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
  spinnerCard: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[6],
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "space-around",
  },
  spinnerItem: {
    alignItems: "center",
    gap: spacing[3],
  },
  spinnerLabel: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  progressCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing[3],
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing[2],
  },
  progressLabel: {
    fontSize: fontSize.sm,
    color: colors.foreground,
  },
  progressValue: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  skeleton: {
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    overflow: "hidden",
  },
  shimmer: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  skeletonCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing[3],
    gap: spacing[3],
  },
  skeletonHeader: {
    flexDirection: "row",
    gap: spacing[3],
  },
  skeletonHeaderText: {
    flex: 1,
    gap: spacing[2],
    justifyContent: "center",
  },
  skeletonList: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  skeletonListItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[4],
    gap: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  skeletonListContent: {
    flex: 1,
    gap: spacing[2],
  },
  circularGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[6],
    borderWidth: 1,
    borderColor: colors.border,
  },
  circularItem: {
    alignItems: "center",
    gap: spacing[3],
  },
  circularProgress: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  circularTrack: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 40,
    borderWidth: 8,
    borderColor: colors.muted,
  },
  circularFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 40,
    borderWidth: 8,
    borderColor: colors.primary,
    borderTopColor: "transparent",
    borderRightColor: "transparent",
  },
  circularComplete: {
    borderColor: colors.success,
    borderTopColor: colors.success,
    borderRightColor: colors.success,
  },
  circularInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
  },
  circularValue: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.primary,
  },
  circularLabel: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
});
