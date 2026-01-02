/**
 * Typography Page
 *
 * Displays font families, heading scale, and text styles.
 */

import { ScrollView, StyleSheet, Text, View } from "react-native";

import { borderRadius, colors, fontSize, fontWeight, spacing } from "@/constants/theme";

export default function TypographyPage() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Typography</Text>
        <Text style={styles.subtitle}>
          Font families, heading scale, text colors
        </Text>
      </View>

      {/* Heading Scale */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Heading Scale</Text>
        <View style={styles.card}>
          <Text style={styles.h1}>Heading 1 (2xl)</Text>
          <Text style={styles.h2}>Heading 2 (xl)</Text>
          <Text style={styles.h3}>Heading 3 (lg)</Text>
          <Text style={styles.h4}>Heading 4 (base)</Text>
          <Text style={styles.h5}>Heading 5 (sm)</Text>
          <Text style={styles.h6}>Heading 6 (xs)</Text>
        </View>
      </View>

      {/* Font Sizes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Font Sizes</Text>
        <View style={styles.card}>
          <View style={styles.fontSizeRow}>
            <Text style={[styles.sizeLabel, { fontSize: fontSize.xs }]}>
              XS (12px)
            </Text>
            <Text style={styles.sizeValue}>fontSize.xs</Text>
          </View>
          <View style={styles.fontSizeRow}>
            <Text style={[styles.sizeLabel, { fontSize: fontSize.sm }]}>
              SM (14px)
            </Text>
            <Text style={styles.sizeValue}>fontSize.sm</Text>
          </View>
          <View style={styles.fontSizeRow}>
            <Text style={[styles.sizeLabel, { fontSize: fontSize.base }]}>
              Base (16px)
            </Text>
            <Text style={styles.sizeValue}>fontSize.base</Text>
          </View>
          <View style={styles.fontSizeRow}>
            <Text style={[styles.sizeLabel, { fontSize: fontSize.lg }]}>
              LG (18px)
            </Text>
            <Text style={styles.sizeValue}>fontSize.lg</Text>
          </View>
          <View style={styles.fontSizeRow}>
            <Text style={[styles.sizeLabel, { fontSize: fontSize.xl }]}>
              XL (20px)
            </Text>
            <Text style={styles.sizeValue}>fontSize.xl</Text>
          </View>
          <View style={styles.fontSizeRow}>
            <Text style={[styles.sizeLabel, { fontSize: fontSize["2xl"] }]}>
              2XL (24px)
            </Text>
            <Text style={styles.sizeValue}>fontSize["2xl"]</Text>
          </View>
        </View>
      </View>

      {/* Font Weights */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Font Weights</Text>
        <View style={styles.card}>
          <Text
            style={[styles.weightSample, { fontWeight: fontWeight.normal }]}
          >
            Normal (400)
          </Text>
          <Text
            style={[styles.weightSample, { fontWeight: fontWeight.medium }]}
          >
            Medium (500)
          </Text>
          <Text
            style={[styles.weightSample, { fontWeight: fontWeight.semibold }]}
          >
            Semibold (600)
          </Text>
          <Text style={[styles.weightSample, { fontWeight: fontWeight.bold }]}>
            Bold (700)
          </Text>
          <Text
            style={[styles.weightSample, { fontWeight: fontWeight.extrabold }]}
          >
            Extra Bold (800)
          </Text>
        </View>
      </View>

      {/* Text Colors */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Text Colors</Text>
        <View style={styles.card}>
          <Text style={[styles.textSample, { color: colors.foreground }]}>
            Primary Text (foreground)
          </Text>
          <Text style={[styles.textSample, { color: colors.mutedForeground }]}>
            Secondary Text (muted)
          </Text>
          <Text style={[styles.textSample, { color: colors.primary }]}>
            Accent Text (primary)
          </Text>
          <Text style={[styles.textSample, { color: colors.destructive }]}>
            Error Text (destructive)
          </Text>
          <Text style={[styles.textSample, { color: colors.success }]}>
            Success Text (success)
          </Text>
        </View>
      </View>

      {/* Paragraph Example */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Paragraph Text</Text>
        <View style={styles.card}>
          <Text style={styles.paragraph}>
            The spike.land design system uses a carefully crafted typography scale that ensures
            readability and visual hierarchy across all screen sizes. Our type system is built on a
            modular scale with consistent line heights and letter spacing.
          </Text>
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
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing[3],
  },
  h1: {
    fontSize: fontSize["2xl"],
    fontWeight: "700",
    color: colors.foreground,
  },
  h2: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.foreground,
  },
  h3: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.foreground,
  },
  h4: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.foreground,
  },
  h5: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  h6: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.foreground,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  fontSizeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing[1],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sizeLabel: {
    color: colors.foreground,
    fontWeight: "500",
  },
  sizeValue: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    fontFamily: "monospace",
  },
  weightSample: {
    fontSize: fontSize.base,
    color: colors.foreground,
    paddingVertical: spacing[1],
  },
  textSample: {
    fontSize: fontSize.base,
    paddingVertical: spacing[1],
  },
  paragraph: {
    fontSize: fontSize.base,
    color: colors.foreground,
    lineHeight: 24,
  },
});
