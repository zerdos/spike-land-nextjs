/**
 * Surfaces Page
 *
 * Displays glass-morphism tiers, elevation system, and transparency effects.
 */

import { ScrollView, StyleSheet, Text, View } from "react-native";

import { borderRadius, colors, fontSize, glassMorphism, shadows, spacing } from "@/constants/theme";

export default function SurfacesPage() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Surfaces</Text>
        <Text style={styles.subtitle}>
          Glass-morphism tiers, elevation system, and transparency
        </Text>
      </View>

      {/* Glass Tiers */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Glass Morphism Tiers</Text>
        <Text style={styles.sectionDescription}>
          Three levels of transparency for layered interfaces.
        </Text>
        <View style={styles.glassGrid}>
          <View
            style={[styles.glassCard, {
              backgroundColor: glassMorphism.glass0,
            }]}
          >
            <Text style={styles.glassLabel}>Glass 0</Text>
            <Text style={styles.glassValue}>5% opacity</Text>
          </View>
          <View
            style={[styles.glassCard, {
              backgroundColor: glassMorphism.glass1,
            }]}
          >
            <Text style={styles.glassLabel}>Glass 1</Text>
            <Text style={styles.glassValue}>8% opacity</Text>
          </View>
          <View
            style={[styles.glassCard, {
              backgroundColor: glassMorphism.glass2,
            }]}
          >
            <Text style={styles.glassLabel}>Glass 2</Text>
            <Text style={styles.glassValue}>12% opacity</Text>
          </View>
        </View>
      </View>

      {/* Elevation System */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Elevation System</Text>
        <Text style={styles.sectionDescription}>
          Shadow depths for creating visual hierarchy.
        </Text>
        <View style={styles.elevationGrid}>
          <View style={[styles.elevationCard, shadows.none]}>
            <Text style={styles.elevationLabel}>None</Text>
            <Text style={styles.elevationValue}>elevation: 0</Text>
          </View>
          <View style={[styles.elevationCard, shadows.sm]}>
            <Text style={styles.elevationLabel}>Small</Text>
            <Text style={styles.elevationValue}>elevation: 1</Text>
          </View>
          <View style={[styles.elevationCard, shadows.DEFAULT]}>
            <Text style={styles.elevationLabel}>Default</Text>
            <Text style={styles.elevationValue}>elevation: 2</Text>
          </View>
          <View style={[styles.elevationCard, shadows.md]}>
            <Text style={styles.elevationLabel}>Medium</Text>
            <Text style={styles.elevationValue}>elevation: 4</Text>
          </View>
          <View style={[styles.elevationCard, shadows.lg]}>
            <Text style={styles.elevationLabel}>Large</Text>
            <Text style={styles.elevationValue}>elevation: 8</Text>
          </View>
          <View style={[styles.elevationCard, shadows.xl]}>
            <Text style={styles.elevationLabel}>XL</Text>
            <Text style={styles.elevationValue}>elevation: 12</Text>
          </View>
        </View>
      </View>

      {/* Border Radius */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Border Radius</Text>
        <Text style={styles.sectionDescription}>
          Consistent corner rounding for cohesive design.
        </Text>
        <View style={styles.radiusGrid}>
          <View style={styles.radiusItem}>
            <View
              style={[styles.radiusBox, { borderRadius: borderRadius.none }]}
            />
            <Text style={styles.radiusLabel}>None</Text>
          </View>
          <View style={styles.radiusItem}>
            <View
              style={[styles.radiusBox, { borderRadius: borderRadius.sm }]}
            />
            <Text style={styles.radiusLabel}>SM (4px)</Text>
          </View>
          <View style={styles.radiusItem}>
            <View
              style={[styles.radiusBox, { borderRadius: borderRadius.DEFAULT }]}
            />
            <Text style={styles.radiusLabel}>Default (8px)</Text>
          </View>
          <View style={styles.radiusItem}>
            <View
              style={[styles.radiusBox, { borderRadius: borderRadius.md }]}
            />
            <Text style={styles.radiusLabel}>MD (10px)</Text>
          </View>
          <View style={styles.radiusItem}>
            <View
              style={[styles.radiusBox, { borderRadius: borderRadius.lg }]}
            />
            <Text style={styles.radiusLabel}>LG (14px)</Text>
          </View>
          <View style={styles.radiusItem}>
            <View
              style={[styles.radiusBox, { borderRadius: borderRadius.xl }]}
            />
            <Text style={styles.radiusLabel}>XL (18px)</Text>
          </View>
          <View style={styles.radiusItem}>
            <View
              style={[styles.radiusBox, { borderRadius: borderRadius["2xl"] }]}
            />
            <Text style={styles.radiusLabel}>2XL (24px)</Text>
          </View>
          <View style={styles.radiusItem}>
            <View
              style={[styles.radiusBox, { borderRadius: borderRadius.full }]}
            />
            <Text style={styles.radiusLabel}>Full</Text>
          </View>
        </View>
      </View>

      {/* Card Variants */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Card Variants</Text>
        <Text style={styles.sectionDescription}>
          Different card styles for various use cases.
        </Text>
        <View style={styles.cardGrid}>
          <View style={styles.cardDefault}>
            <Text style={styles.cardLabel}>Default</Text>
            <Text style={styles.cardDescription}>
              Standard card with border
            </Text>
          </View>
          <View
            style={[styles.cardDefault, {
              backgroundColor: glassMorphism.glassCard,
            }]}
          >
            <Text style={styles.cardLabel}>Glass</Text>
            <Text style={styles.cardDescription}>Transparent glass effect</Text>
          </View>
          <View style={[styles.cardDefault, shadows.lg]}>
            <Text style={styles.cardLabel}>Elevated</Text>
            <Text style={styles.cardDescription}>Raised with shadow</Text>
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
  glassGrid: {
    gap: spacing[3],
  },
  glassCard: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: glassMorphism.glassBorder,
  },
  glassLabel: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.foreground,
  },
  glassValue: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing[1],
  },
  elevationGrid: {
    gap: spacing[3],
  },
  elevationCard: {
    backgroundColor: colors.card,
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  elevationLabel: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.foreground,
  },
  elevationValue: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    fontFamily: "monospace",
    marginTop: spacing[1],
  },
  radiusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[3],
  },
  radiusItem: {
    alignItems: "center",
    gap: spacing[2],
  },
  radiusBox: {
    width: 48,
    height: 48,
    backgroundColor: colors.primary,
  },
  radiusLabel: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  cardGrid: {
    gap: spacing[3],
  },
  cardDefault: {
    backgroundColor: colors.card,
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLabel: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.foreground,
  },
  cardDescription: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing[1],
  },
});
