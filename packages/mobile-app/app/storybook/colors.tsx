/**
 * Colors Page
 *
 * Displays the spike.land color palette including brand colors,
 * semantic colors, and theme variations.
 */

import { ScrollView, StyleSheet, Text, View } from "react-native";

import { borderRadius, colors, fontSize, spacing } from "@/constants/theme";

const colorPalette = {
  brand: [
    {
      name: "Pixel Cyan",
      hex: colors.primary,
      description: "Primary brand accent",
    },
    {
      name: "Pixel Fuchsia",
      hex: colors.pixelFuchsia,
      description: "Secondary accent",
    },
  ],
  semantic: [
    {
      name: "Success",
      hex: colors.success,
      description: "Positive actions & states",
    },
    {
      name: "Warning",
      hex: colors.warning,
      description: "Cautionary information",
    },
    {
      name: "Destructive",
      hex: colors.destructive,
      description: "Errors & deletions",
    },
  ],
  surfaces: [
    {
      name: "Background",
      hex: colors.background,
      description: "Main background",
    },
    { name: "Card", hex: colors.card, description: "Elevated surfaces" },
    { name: "Muted", hex: colors.muted, description: "Subtle backgrounds" },
  ],
  text: [
    { name: "Foreground", hex: colors.foreground, description: "Primary text" },
    {
      name: "Muted Foreground",
      hex: colors.mutedForeground,
      description: "Secondary text",
    },
    { name: "Border", hex: colors.border, description: "Dividers & outlines" },
  ],
};

export default function ColorsPage() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Colors</Text>
        <Text style={styles.subtitle}>
          Color palette, brand colors, dark/light modes, glow effects
        </Text>
      </View>

      {/* Brand Colors */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Brand Colors</Text>
        <Text style={styles.sectionDescription}>
          Core brand colors that define the spike.land identity.
        </Text>
        <View style={styles.colorGrid}>
          {colorPalette.brand.map((color) => (
            <View key={color.name} style={styles.colorCard}>
              <View
                style={[styles.colorSwatch, { backgroundColor: color.hex }]}
              />
              <View style={styles.colorInfo}>
                <Text style={styles.colorName}>{color.name}</Text>
                <Text style={styles.colorHex}>{color.hex}</Text>
                <Text style={styles.colorDescription}>{color.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Semantic Colors */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Semantic Colors</Text>
        <Text style={styles.sectionDescription}>
          Colors that convey meaning and system states.
        </Text>
        <View style={styles.colorGrid}>
          {colorPalette.semantic.map((color) => (
            <View key={color.name} style={styles.colorCard}>
              <View
                style={[styles.colorSwatch, { backgroundColor: color.hex }]}
              />
              <View style={styles.colorInfo}>
                <Text style={styles.colorName}>{color.name}</Text>
                <Text style={styles.colorHex}>{color.hex}</Text>
                <Text style={styles.colorDescription}>{color.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Surface Colors */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Surface Colors</Text>
        <Text style={styles.sectionDescription}>
          Background and container colors for layering.
        </Text>
        <View style={styles.colorGrid}>
          {colorPalette.surfaces.map((color) => (
            <View key={color.name} style={styles.colorCard}>
              <View
                style={[styles.colorSwatch, styles.surfaceSwatch, {
                  backgroundColor: color.hex,
                }]}
              />
              <View style={styles.colorInfo}>
                <Text style={styles.colorName}>{color.name}</Text>
                <Text style={styles.colorHex}>{color.hex}</Text>
                <Text style={styles.colorDescription}>{color.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Text Colors */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Text & Border Colors</Text>
        <Text style={styles.sectionDescription}>
          Typography and outline colors.
        </Text>
        <View style={styles.colorGrid}>
          {colorPalette.text.map((color) => (
            <View key={color.name} style={styles.colorCard}>
              <View
                style={[styles.colorSwatch, styles.surfaceSwatch, {
                  backgroundColor: color.hex,
                }]}
              />
              <View style={styles.colorInfo}>
                <Text style={styles.colorName}>{color.name}</Text>
                <Text style={styles.colorHex}>{color.hex}</Text>
                <Text style={styles.colorDescription}>{color.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Glow Effects */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Glow Effects</Text>
        <Text style={styles.sectionDescription}>
          Accent glows for highlighting interactive elements.
        </Text>
        <View style={styles.glowContainer}>
          <View style={[styles.glowBox, styles.glowCyan]}>
            <Text style={styles.glowLabel}>Cyan Glow</Text>
          </View>
          <View style={[styles.glowBox, styles.glowFuchsia]}>
            <Text style={styles.glowLabel}>Fuchsia Glow</Text>
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
  colorGrid: {
    gap: spacing[3],
  },
  colorCard: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing[3],
  },
  colorSwatch: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
  },
  surfaceSwatch: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorInfo: {
    flex: 1,
    justifyContent: "center",
  },
  colorName: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.foreground,
  },
  colorHex: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontFamily: "monospace",
    marginTop: spacing[0.5],
  },
  colorDescription: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing[1],
  },
  glowContainer: {
    flexDirection: "row",
    gap: spacing[4],
  },
  glowBox: {
    flex: 1,
    height: 80,
    borderRadius: borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  glowCyan: {
    backgroundColor: colors.card,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  glowFuchsia: {
    backgroundColor: colors.card,
    shadowColor: colors.pixelFuchsia,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.pixelFuchsia,
  },
  glowLabel: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
});
