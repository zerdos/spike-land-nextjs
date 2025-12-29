/**
 * Layout Page
 *
 * Displays masonry grid, text overlays, and layout patterns.
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { borderRadius, colors, fontSize, spacing } from "@/constants/theme";

export default function LayoutPage() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Layout</Text>
        <Text style={styles.subtitle}>
          Masonry grid, text overlays, and zoom controls
        </Text>
      </View>

      {/* Grid System */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Grid System</Text>
        <Text style={styles.sectionDescription}>
          Responsive grid layouts for content organization.
        </Text>

        <View style={styles.gridDemo}>
          <View style={styles.gridRow}>
            <View style={[styles.gridCell, styles.gridCellFull]}>
              <Text style={styles.gridLabel}>Full Width</Text>
            </View>
          </View>
          <View style={styles.gridRow}>
            <View style={[styles.gridCell, styles.gridCellHalf]}>
              <Text style={styles.gridLabel}>1/2</Text>
            </View>
            <View style={[styles.gridCell, styles.gridCellHalf]}>
              <Text style={styles.gridLabel}>1/2</Text>
            </View>
          </View>
          <View style={styles.gridRow}>
            <View style={[styles.gridCell, styles.gridCellThird]}>
              <Text style={styles.gridLabel}>1/3</Text>
            </View>
            <View style={[styles.gridCell, styles.gridCellThird]}>
              <Text style={styles.gridLabel}>1/3</Text>
            </View>
            <View style={[styles.gridCell, styles.gridCellThird]}>
              <Text style={styles.gridLabel}>1/3</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Masonry Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Masonry Grid</Text>
        <Text style={styles.sectionDescription}>
          Pinterest-style layout for variable height content.
        </Text>

        <View style={styles.masonryContainer}>
          <View style={styles.masonryColumn}>
            <View style={[styles.masonryItem, { height: 120 }]}>
              <Ionicons name="image" size={24} color={colors.primary} />
            </View>
            <View style={[styles.masonryItem, { height: 180 }]}>
              <Ionicons name="image" size={24} color={colors.primary} />
            </View>
            <View style={[styles.masonryItem, { height: 100 }]}>
              <Ionicons name="image" size={24} color={colors.primary} />
            </View>
          </View>
          <View style={styles.masonryColumn}>
            <View style={[styles.masonryItem, { height: 160 }]}>
              <Ionicons name="image" size={24} color={colors.primary} />
            </View>
            <View style={[styles.masonryItem, { height: 140 }]}>
              <Ionicons name="image" size={24} color={colors.primary} />
            </View>
            <View style={[styles.masonryItem, { height: 100 }]}>
              <Ionicons name="image" size={24} color={colors.primary} />
            </View>
          </View>
        </View>
      </View>

      {/* Text Overlays */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Text Overlays</Text>
        <Text style={styles.sectionDescription}>
          Layered text on images with gradient backgrounds.
        </Text>

        <View style={styles.overlayDemo}>
          <View style={styles.overlayCard}>
            <View style={styles.overlayBackground} />
            <View style={styles.overlayGradient} />
            <View style={styles.overlayContent}>
              <Text style={styles.overlayTitle}>Featured Image</Text>
              <Text style={styles.overlaySubtitle}>With gradient overlay</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Zoom Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Zoom Controls</Text>
        <Text style={styles.sectionDescription}>
          Pinch-to-zoom and button controls for image viewing.
        </Text>

        <View style={styles.zoomCard}>
          <View style={styles.zoomImagePlaceholder}>
            <Ionicons name="expand" size={32} color={colors.mutedForeground} />
            <Text style={styles.zoomPlaceholderText}>Zoomable Image</Text>
          </View>
          <View style={styles.zoomControls}>
            <View style={styles.zoomButton}>
              <Ionicons name="remove" size={20} color={colors.foreground} />
            </View>
            <Text style={styles.zoomLevel}>100%</Text>
            <View style={styles.zoomButton}>
              <Ionicons name="add" size={20} color={colors.foreground} />
            </View>
            <View style={[styles.zoomButton, styles.zoomButtonRight]}>
              <Ionicons name="scan" size={20} color={colors.foreground} />
            </View>
          </View>
        </View>
      </View>

      {/* Spacing System */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Spacing Scale</Text>
        <Text style={styles.sectionDescription}>
          Consistent spacing tokens for layout consistency.
        </Text>

        <View style={styles.spacingCard}>
          {[1, 2, 3, 4, 6, 8].map((scale) => (
            <View key={scale} style={styles.spacingRow}>
              <View
                style={[styles.spacingBox, { width: spacing[scale as keyof typeof spacing] }]}
              />
              <Text style={styles.spacingLabel}>
                spacing[{scale}] = {spacing[scale as keyof typeof spacing]}px
              </Text>
            </View>
          ))}
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
  gridDemo: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing[2],
  },
  gridRow: {
    flexDirection: "row",
    gap: spacing[2],
  },
  gridCell: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing[4],
    justifyContent: "center",
    alignItems: "center",
  },
  gridCellFull: {
    flex: 1,
  },
  gridCellHalf: {
    flex: 1,
  },
  gridCellThird: {
    flex: 1,
  },
  gridLabel: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.primaryForeground,
  },
  masonryContainer: {
    flexDirection: "row",
    gap: spacing[3],
  },
  masonryColumn: {
    flex: 1,
    gap: spacing[3],
  },
  masonryItem: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayDemo: {
    gap: spacing[3],
  },
  overlayCard: {
    height: 180,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    position: "relative",
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.muted,
  },
  overlayGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  overlayContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing[4],
  },
  overlayTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.foreground,
  },
  overlaySubtitle: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing[1],
  },
  zoomCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  zoomImagePlaceholder: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.muted,
    gap: spacing[2],
  },
  zoomPlaceholderText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  zoomControls: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing[2],
  },
  zoomButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    justifyContent: "center",
    alignItems: "center",
  },
  zoomButtonRight: {
    marginLeft: "auto",
  },
  zoomLevel: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.foreground,
    minWidth: 50,
    textAlign: "center",
  },
  spacingCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing[3],
  },
  spacingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  spacingBox: {
    height: 24,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  spacingLabel: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    fontFamily: "monospace",
  },
});
