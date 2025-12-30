/**
 * PhotoMix Page
 *
 * Displays photo mixing and blending components.
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { Button } from "@/components/ui/Button";
import { borderRadius, colors, fontSize, spacing } from "@/constants/theme";

export default function PhotoMixPage() {
  const [activeBlendMode, setActiveBlendMode] = useState("normal");
  const opacity = useSharedValue(1);

  const blendModes = [
    { id: "normal", label: "Normal" },
    { id: "multiply", label: "Multiply" },
    { id: "screen", label: "Screen" },
    { id: "overlay", label: "Overlay" },
    { id: "difference", label: "Difference" },
  ];

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>PhotoMix</Text>
        <Text style={styles.subtitle}>
          Photo mixing and blending components
        </Text>
      </View>

      {/* Layer Stack */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Layer Stack</Text>
        <Text style={styles.sectionDescription}>
          Manage multiple image layers with drag-and-drop reordering.
        </Text>

        <View style={styles.layerCard}>
          <View style={styles.layer}>
            <View style={styles.layerPreview}>
              <Ionicons name="image" size={20} color={colors.primary} />
            </View>
            <View style={styles.layerInfo}>
              <Text style={styles.layerName}>Background</Text>
              <Text style={styles.layerType}>Base Layer</Text>
            </View>
            <Ionicons
              name="lock-closed"
              size={18}
              color={colors.mutedForeground}
            />
          </View>
          <View style={[styles.layer, styles.layerActive]}>
            <View style={styles.layerPreview}>
              <Ionicons name="image" size={20} color={colors.primary} />
            </View>
            <View style={styles.layerInfo}>
              <Text style={styles.layerName}>Enhanced Photo</Text>
              <Text style={styles.layerType}>AI Upscaled</Text>
            </View>
            <Ionicons name="eye" size={18} color={colors.primary} />
          </View>
          <View style={styles.layer}>
            <View style={styles.layerPreview}>
              <Ionicons name="text" size={20} color={colors.primary} />
            </View>
            <View style={styles.layerInfo}>
              <Text style={styles.layerName}>Text Overlay</Text>
              <Text style={styles.layerType}>Typography</Text>
            </View>
            <Ionicons name="eye" size={18} color={colors.foreground} />
          </View>
        </View>
      </View>

      {/* Blend Modes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Blend Modes</Text>
        <Text style={styles.sectionDescription}>
          Apply different blending effects between layers.
        </Text>

        <View style={styles.blendCard}>
          <View style={styles.blendPreview}>
            <View style={styles.blendLayer1}>
              <Ionicons name="image" size={32} color={colors.primary} />
            </View>
            <Animated.View style={[styles.blendLayer2, overlayStyle]}>
              <Ionicons
                name="color-wand"
                size={32}
                color={colors.pixelFuchsia}
              />
            </Animated.View>
          </View>
          <View style={styles.blendModes}>
            {blendModes.map((mode) => (
              <Pressable
                key={mode.id}
                style={[
                  styles.blendModeButton,
                  activeBlendMode === mode.id && styles.blendModeButtonActive,
                ]}
                onPress={() => setActiveBlendMode(mode.id)}
              >
                <Text
                  style={[
                    styles.blendModeText,
                    activeBlendMode === mode.id && styles.blendModeTextActive,
                  ]}
                >
                  {mode.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* Opacity Slider */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Opacity Control</Text>
        <Text style={styles.sectionDescription}>
          Adjust layer transparency for subtle blending.
        </Text>

        <View style={styles.opacityCard}>
          <View style={styles.opacityHeader}>
            <Text style={styles.opacityLabel}>Layer Opacity</Text>
            <Text style={styles.opacityValue}>100%</Text>
          </View>
          <View style={styles.opacitySlider}>
            <View style={styles.opacityTrack}>
              <View style={[styles.opacityFill, { width: "100%" }]} />
            </View>
            <View style={[styles.opacityThumb, { left: "100%" }]} />
          </View>
          <View style={styles.opacityPresets}>
            <Pressable
              style={styles.presetButton}
              onPress={() => {
                opacity.value = withSpring(0.25);
              }}
            >
              <Text style={styles.presetText}>25%</Text>
            </Pressable>
            <Pressable
              style={styles.presetButton}
              onPress={() => {
                opacity.value = withSpring(0.5);
              }}
            >
              <Text style={styles.presetText}>50%</Text>
            </Pressable>
            <Pressable
              style={styles.presetButton}
              onPress={() => {
                opacity.value = withSpring(0.75);
              }}
            >
              <Text style={styles.presetText}>75%</Text>
            </Pressable>
            <Pressable
              style={styles.presetButton}
              onPress={() => {
                opacity.value = withSpring(1);
              }}
            >
              <Text style={styles.presetText}>100%</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Transform Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transform Controls</Text>
        <Text style={styles.sectionDescription}>
          Scale, rotate, and position layers precisely.
        </Text>

        <View style={styles.transformCard}>
          <View style={styles.transformRow}>
            <View style={styles.transformControl}>
              <Text style={styles.transformLabel}>Scale</Text>
              <View style={styles.transformInput}>
                <Text style={styles.transformValue}>100%</Text>
              </View>
            </View>
            <View style={styles.transformControl}>
              <Text style={styles.transformLabel}>Rotation</Text>
              <View style={styles.transformInput}>
                <Text style={styles.transformValue}>0&deg;</Text>
              </View>
            </View>
          </View>
          <View style={styles.transformRow}>
            <View style={styles.transformControl}>
              <Text style={styles.transformLabel}>X Position</Text>
              <View style={styles.transformInput}>
                <Text style={styles.transformValue}>0 px</Text>
              </View>
            </View>
            <View style={styles.transformControl}>
              <Text style={styles.transformLabel}>Y Position</Text>
              <View style={styles.transformInput}>
                <Text style={styles.transformValue}>0 px</Text>
              </View>
            </View>
          </View>
          <View style={styles.transformActions}>
            <Pressable style={styles.transformAction}>
              <Ionicons name="sync" size={18} color={colors.foreground} />
            </Pressable>
            <Pressable style={styles.transformAction}>
              <Ionicons name="resize" size={18} color={colors.foreground} />
            </Pressable>
            <Pressable style={styles.transformAction}>
              <Ionicons name="move" size={18} color={colors.foreground} />
            </Pressable>
            <Pressable style={styles.transformAction}>
              <Ionicons name="crop" size={18} color={colors.foreground} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Export Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Export Options</Text>
        <Text style={styles.sectionDescription}>
          Save your composed image in various formats.
        </Text>

        <View style={styles.exportCard}>
          <View style={styles.exportFormat}>
            <View style={styles.exportFormatInfo}>
              <Ionicons name="image-outline" size={24} color={colors.primary} />
              <View>
                <Text style={styles.exportFormatName}>PNG</Text>
                <Text style={styles.exportFormatDesc}>
                  Lossless with transparency
                </Text>
              </View>
            </View>
            <View style={[styles.formatBadge, styles.formatBadgeActive]}>
              <Text style={styles.formatBadgeText}>Selected</Text>
            </View>
          </View>
          <View style={styles.exportFormat}>
            <View style={styles.exportFormatInfo}>
              <Ionicons
                name="image-outline"
                size={24}
                color={colors.mutedForeground}
              />
              <View>
                <Text style={styles.exportFormatName}>JPEG</Text>
                <Text style={styles.exportFormatDesc}>
                  Compressed, smaller size
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.exportFormat}>
            <View style={styles.exportFormatInfo}>
              <Ionicons
                name="code-outline"
                size={24}
                color={colors.mutedForeground}
              />
              <View>
                <Text style={styles.exportFormatName}>WebP</Text>
                <Text style={styles.exportFormatDesc}>
                  Modern format, best quality
                </Text>
              </View>
            </View>
          </View>
          <Button
            fullWidth
            iconLeft={
              <Ionicons
                name="download-outline"
                size={18}
                color={colors.primaryForeground}
              />
            }
          >
            Export Image
          </Button>
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
  layerCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing[2],
  },
  layer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    padding: spacing[3],
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
  },
  layerActive: {
    backgroundColor: `${colors.primary}15`,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  layerPreview: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
  },
  layerInfo: {
    flex: 1,
  },
  layerName: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  layerType: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginTop: spacing[0.5],
  },
  blendCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
  },
  blendPreview: {
    height: 120,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing[4],
    position: "relative",
  },
  blendLayer1: {
    position: "absolute",
  },
  blendLayer2: {
    position: "absolute",
    marginLeft: 20,
    marginTop: 20,
  },
  blendModes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  blendModeButton: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  blendModeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  blendModeText: {
    fontSize: fontSize.sm,
    color: colors.foreground,
  },
  blendModeTextActive: {
    color: colors.primaryForeground,
  },
  opacityCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
  },
  opacityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing[3],
  },
  opacityLabel: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  opacityValue: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: "600",
  },
  opacitySlider: {
    height: 24,
    justifyContent: "center",
    marginBottom: spacing[3],
  },
  opacityTrack: {
    height: 4,
    backgroundColor: colors.muted,
    borderRadius: 2,
  },
  opacityFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  opacityThumb: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.foreground,
    marginLeft: -10,
  },
  opacityPresets: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  presetButton: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
  },
  presetText: {
    fontSize: fontSize.sm,
    color: colors.foreground,
  },
  transformCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing[4],
  },
  transformRow: {
    flexDirection: "row",
    gap: spacing[3],
  },
  transformControl: {
    flex: 1,
  },
  transformLabel: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginBottom: spacing[1],
  },
  transformInput: {
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    alignItems: "center",
  },
  transformValue: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: colors.foreground,
  },
  transformActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing[3],
  },
  transformAction: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    justifyContent: "center",
    alignItems: "center",
  },
  exportCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing[3],
  },
  exportFormat: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing[3],
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
  },
  exportFormatInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  exportFormatName: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  exportFormatDesc: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  formatBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    backgroundColor: colors.card,
  },
  formatBadgeActive: {
    backgroundColor: colors.primary,
  },
  formatBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.primaryForeground,
  },
});
