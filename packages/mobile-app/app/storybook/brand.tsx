/**
 * Brand Page
 *
 * Displays spike.land brand assets including logos, icons, and brand guidelines.
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { borderRadius, colors, fontSize, spacing } from "@/constants/theme";

export default function BrandPage() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Brand</Text>
        <Text style={styles.subtitle}>
          Logo variants, sizes, and the spike.land AI Spark logo
        </Text>
      </View>

      {/* Logo Showcase */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Logo Variants</Text>
        <View style={styles.logoGrid}>
          {/* Primary Logo */}
          <View style={styles.logoCard}>
            <View style={styles.logoContainer}>
              <View style={styles.sparkIcon}>
                <Ionicons name="diamond" size={40} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.logoLabel}>Primary</Text>
          </View>

          {/* Icon Only */}
          <View style={styles.logoCard}>
            <View style={styles.logoContainer}>
              <Ionicons name="diamond" size={32} color={colors.primary} />
            </View>
            <Text style={styles.logoLabel}>Icon</Text>
          </View>

          {/* Horizontal */}
          <View style={styles.logoCard}>
            <View style={[styles.logoContainer, styles.logoHorizontal]}>
              <Ionicons name="diamond" size={24} color={colors.primary} />
              <Text style={styles.logoText}>spike.land</Text>
            </View>
            <Text style={styles.logoLabel}>Horizontal</Text>
          </View>
        </View>
      </View>

      {/* Logo Sizes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Logo Sizes</Text>
        <View style={styles.sizeGrid}>
          <View style={styles.sizeItem}>
            <Ionicons name="diamond" size={16} color={colors.primary} />
            <Text style={styles.sizeLabel}>SM (16px)</Text>
          </View>
          <View style={styles.sizeItem}>
            <Ionicons name="diamond" size={24} color={colors.primary} />
            <Text style={styles.sizeLabel}>MD (24px)</Text>
          </View>
          <View style={styles.sizeItem}>
            <Ionicons name="diamond" size={32} color={colors.primary} />
            <Text style={styles.sizeLabel}>LG (32px)</Text>
          </View>
          <View style={styles.sizeItem}>
            <Ionicons name="diamond" size={48} color={colors.primary} />
            <Text style={styles.sizeLabel}>XL (48px)</Text>
          </View>
        </View>
      </View>

      {/* Brand Colors */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Brand Colors</Text>
        <View style={styles.colorRow}>
          <View style={[styles.colorSwatch, { backgroundColor: colors.primary }]} />
          <View style={styles.colorInfo}>
            <Text style={styles.colorName}>Pixel Cyan</Text>
            <Text style={styles.colorValue}>#00E5FF</Text>
          </View>
        </View>
        <View style={styles.colorRow}>
          <View style={[styles.colorSwatch, { backgroundColor: colors.pixelFuchsia }]} />
          <View style={styles.colorInfo}>
            <Text style={styles.colorName}>Pixel Fuchsia</Text>
            <Text style={styles.colorValue}>#FF00FF</Text>
          </View>
        </View>
      </View>

      {/* Brand Guidelines */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Usage Guidelines</Text>
        <View style={styles.guidelineCard}>
          <View style={styles.guidelineItem}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.guidelineText}>
              Use the primary cyan color for interactive elements
            </Text>
          </View>
          <View style={styles.guidelineItem}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.guidelineText}>
              Maintain minimum clear space around the logo
            </Text>
          </View>
          <View style={styles.guidelineItem}>
            <Ionicons name="close-circle" size={20} color={colors.destructive} />
            <Text style={styles.guidelineText}>
              Don't alter the logo colors or proportions
            </Text>
          </View>
          <View style={styles.guidelineItem}>
            <Ionicons name="close-circle" size={20} color={colors.destructive} />
            <Text style={styles.guidelineText}>
              Don't place on low contrast backgrounds
            </Text>
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
    marginBottom: spacing[3],
  },
  logoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[3],
  },
  logoCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 100,
    flex: 1,
  },
  logoContainer: {
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  logoHorizontal: {
    flexDirection: "row",
    gap: spacing[2],
  },
  sparkIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.xl,
    backgroundColor: `${colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.foreground,
  },
  logoLabel: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing[2],
  },
  sizeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[4],
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
  },
  sizeItem: {
    alignItems: "center",
    gap: spacing[2],
  },
  sizeLabel: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing[2],
  },
  colorSwatch: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
  },
  colorInfo: {
    flex: 1,
  },
  colorName: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.foreground,
  },
  colorValue: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    fontFamily: "monospace",
  },
  guidelineCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing[3],
  },
  guidelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[3],
  },
  guidelineText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.foreground,
    lineHeight: 20,
  },
});
