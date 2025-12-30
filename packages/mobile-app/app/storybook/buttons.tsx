/**
 * Buttons Page
 *
 * Displays button variants, sizes, states, and loading indicators.
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { borderRadius, colors, fontSize, spacing } from "@/constants/theme";

export default function ButtonsPage() {
  const [loading, setLoading] = useState(false);

  const handleLoadingDemo = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Buttons</Text>
        <Text style={styles.subtitle}>
          Button variants, sizes, states, loading indicators
        </Text>
      </View>

      {/* Button Variants */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Variants</Text>
        <Text style={styles.sectionDescription}>
          Different button styles for various actions.
        </Text>
        <View style={styles.card}>
          <View style={styles.buttonRow}>
            <Button variant="primary">Primary</Button>
          </View>
          <View style={styles.buttonRow}>
            <Button variant="secondary">Secondary</Button>
          </View>
          <View style={styles.buttonRow}>
            <Button variant="outline">Outline</Button>
          </View>
          <View style={styles.buttonRow}>
            <Button variant="ghost">Ghost</Button>
          </View>
          <View style={styles.buttonRow}>
            <Button variant="destructive">Destructive</Button>
          </View>
        </View>
      </View>

      {/* Button Sizes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sizes</Text>
        <Text style={styles.sectionDescription}>
          Three sizes for different contexts.
        </Text>
        <View style={styles.card}>
          <View style={styles.sizeRow}>
            <Button size="sm">Small</Button>
            <Text style={styles.sizeLabel}>36px height</Text>
          </View>
          <View style={styles.sizeRow}>
            <Button size="md">Medium</Button>
            <Text style={styles.sizeLabel}>44px height</Text>
          </View>
          <View style={styles.sizeRow}>
            <Button size="lg">Large</Button>
            <Text style={styles.sizeLabel}>52px height</Text>
          </View>
        </View>
      </View>

      {/* Button States */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>States</Text>
        <Text style={styles.sectionDescription}>
          Interactive states and accessibility.
        </Text>
        <View style={styles.card}>
          <View style={styles.buttonRow}>
            <Button>Default</Button>
          </View>
          <View style={styles.buttonRow}>
            <Button disabled>Disabled</Button>
          </View>
          <View style={styles.buttonRow}>
            <Button loading={loading} onPress={handleLoadingDemo}>
              {loading ? "Loading..." : "Click to Load"}
            </Button>
          </View>
        </View>
      </View>

      {/* Buttons with Icons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>With Icons</Text>
        <Text style={styles.sectionDescription}>
          Buttons can include icons for enhanced UX.
        </Text>
        <View style={styles.card}>
          <View style={styles.buttonRow}>
            <Button
              iconLeft={
                <Ionicons
                  name="add"
                  size={18}
                  color={colors.primaryForeground}
                />
              }
            >
              Add Item
            </Button>
          </View>
          <View style={styles.buttonRow}>
            <Button
              variant="outline"
              iconRight={
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={colors.foreground}
                />
              }
            >
              Next Step
            </Button>
          </View>
          <View style={styles.buttonRow}>
            <Button
              variant="destructive"
              iconLeft={
                <Ionicons
                  name="trash"
                  size={18}
                  color={colors.destructiveForeground}
                />
              }
            >
              Delete
            </Button>
          </View>
        </View>
      </View>

      {/* Full Width */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Full Width</Text>
        <Text style={styles.sectionDescription}>
          Buttons that span the full container width.
        </Text>
        <View style={styles.card}>
          <Button fullWidth>Full Width Primary</Button>
          <Button variant="outline" fullWidth>Full Width Outline</Button>
        </View>
      </View>

      {/* Usage Guidelines */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Usage Guidelines</Text>
        <View style={styles.guidelinesCard}>
          <View style={styles.guidelineItem}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.success}
            />
            <Text style={styles.guidelineText}>
              Use primary buttons for main actions
            </Text>
          </View>
          <View style={styles.guidelineItem}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.success}
            />
            <Text style={styles.guidelineText}>
              Limit one primary button per view
            </Text>
          </View>
          <View style={styles.guidelineItem}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.success}
            />
            <Text style={styles.guidelineText}>
              Use destructive variant for dangerous actions
            </Text>
          </View>
          <View style={styles.guidelineItem}>
            <Ionicons
              name="close-circle"
              size={20}
              color={colors.destructive}
            />
            <Text style={styles.guidelineText}>
              Avoid using multiple button styles together
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
    marginBottom: spacing[1],
  },
  sectionDescription: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
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
  buttonRow: {
    alignItems: "flex-start",
  },
  sizeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sizeLabel: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    fontFamily: "monospace",
  },
  guidelinesCard: {
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
