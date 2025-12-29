/**
 * Storybook Overview Page
 *
 * The main landing page for the mobile storybook.
 * Displays an overview of all available design system sections.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { borderRadius, colors, fontSize, spacing } from "@/constants/theme";
import { storybookSections } from "./_layout";

/**
 * Storybook Overview Page
 */
export default function StorybookIndexPage() {
  const router = useRouter();

  // Group sections by category
  const groupedSections = storybookSections.reduce(
    (acc, section) => {
      const category = section.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(section);
      return acc;
    },
    {} as Record<string, (typeof storybookSections)[number][]>,
  );

  const categories = Object.keys(groupedSections);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.heroIcon}>
          <Ionicons name="diamond" size={32} color={colors.primary} />
        </View>
        <Text style={styles.heroTitle}>spike.land Design System</Text>
        <Text style={styles.heroSubtitle}>
          A comprehensive design system built for creating beautiful, consistent mobile interfaces
          with the spike.land brand identity.
        </Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{storybookSections.length}</Text>
          <Text style={styles.statLabel}>Sections</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{categories.length}</Text>
          <Text style={styles.statLabel}>Categories</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>50+</Text>
          <Text style={styles.statLabel}>UI Components</Text>
        </View>
      </View>

      {/* Categories */}
      {categories.map((category) => (
        <View key={category} style={styles.categorySection}>
          <Text style={styles.categoryTitle}>{category}</Text>
          <View style={styles.cardsContainer}>
            {groupedSections[category]?.map((section) => (
              <Pressable
                key={section.id}
                style={({ pressed }) => [styles.sectionCard, pressed && styles.sectionCardPressed]}
                onPress={() => router.push(`/storybook/${section.id}` as never)}
              >
                <View style={styles.sectionCardHeader}>
                  <View style={styles.sectionIconContainer}>
                    <Ionicons name={section.icon} size={24} color={colors.primary} />
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
                </View>
                <Text style={styles.sectionCardTitle}>{section.label}</Text>
                <Text style={styles.sectionCardDescription}>{section.description}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>spike.land Design System v1.2.0</Text>
        <Text style={styles.footerSubtext}>Built with React Native + Expo + Tamagui</Text>
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
  heroSection: {
    alignItems: "center",
    paddingVertical: spacing[8],
    marginBottom: spacing[6],
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius["2xl"],
    backgroundColor: `${colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing[4],
  },
  heroTitle: {
    fontSize: fontSize["2xl"],
    fontWeight: "700",
    color: colors.foreground,
    textAlign: "center",
    marginBottom: spacing[2],
  },
  heroSubtitle: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 400,
  },
  statsContainer: {
    flexDirection: "row",
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  statNumber: {
    fontSize: fontSize["2xl"],
    fontWeight: "700",
    color: colors.primary,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginTop: spacing[1],
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  categorySection: {
    marginBottom: spacing[6],
  },
  categoryTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: spacing[3],
  },
  cardsContainer: {
    gap: spacing[3],
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionCardPressed: {
    opacity: 0.8,
    borderColor: colors.primary,
  },
  sectionCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[3],
  },
  sectionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionCardTitle: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.foreground,
    marginBottom: spacing[1],
  },
  sectionCardDescription: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  footer: {
    alignItems: "center",
    paddingTop: spacing[8],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing[4],
  },
  footerText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.mutedForeground,
  },
  footerSubtext: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    opacity: 0.6,
    marginTop: spacing[1],
  },
});
