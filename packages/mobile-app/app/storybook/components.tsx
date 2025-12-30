/**
 * Components Page
 *
 * Displays cards, badges, inputs, and other UI components.
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { borderRadius, colors, fontSize, spacing } from "@/constants/theme";

export default function ComponentsPage() {
  const [email, setEmail] = useState("");
  const [switchValue, setSwitchValue] = useState(false);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>UI Components</Text>
        <Text style={styles.subtitle}>
          A collection of atomic and molecular elements that form the building blocks of the
          spike.land interface.
        </Text>
      </View>

      {/* Cards Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Card Variants</Text>
        <Text style={styles.sectionDescription}>
          Beyond glass-morphism, we use specialized card styles for specific contexts.
        </Text>

        <View style={styles.cardGrid}>
          <Card>
            <CardHeader>
              <CardTitle>Default Card</CardTitle>
              <CardDescription>Standard card with glass effect</CardDescription>
            </CardHeader>
            <CardContent>
              <Text style={styles.cardText}>
                This is the default card style with a subtle glass morphism effect.
              </Text>
            </CardContent>
            <CardFooter>
              <Button size="sm">Action</Button>
            </CardFooter>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle>Glass Card</CardTitle>
              <CardDescription>Transparent glass effect</CardDescription>
            </CardHeader>
            <CardContent>
              <Text style={styles.cardText}>
                Glass cards are great for layered interfaces.
              </Text>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Elevated Card</CardTitle>
              <CardDescription>Raised with enhanced shadow</CardDescription>
            </CardHeader>
            <CardContent>
              <Text style={styles.cardText}>
                Elevated cards draw attention to important content.
              </Text>
            </CardContent>
          </Card>

          <Card interactive onPressCard={() => {}}>
            <CardHeader>
              <CardTitle>Interactive Card</CardTitle>
              <CardDescription>Press to interact</CardDescription>
            </CardHeader>
            <CardContent>
              <Text style={styles.cardText}>
                Interactive cards respond to touch with animations.
              </Text>
            </CardContent>
          </Card>
        </View>
      </View>

      {/* Inputs Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Inputs & Controls</Text>
        <Text style={styles.sectionDescription}>
          Forms are the heart of our data collection systems.
        </Text>

        <View style={styles.inputCard}>
          <Text style={styles.inputSectionTitle}>Text Input</Text>
          <View style={styles.inputContainer}>
            <Input
              label="Email Address"
              placeholder="e.g. user@spike.land"
              value={email}
              onChangeText={setEmail}
              testID="email-input"
            />
          </View>

          <View style={styles.inputContainer}>
            <Input
              label="Error State"
              value="invalid-email"
              error="Please enter a valid email."
              testID="error-input"
            />
          </View>

          <View style={styles.inputContainer}>
            <Input
              label="Success State"
              value="crypton_spike"
              helperText="Username is available!"
              testID="success-input"
            />
          </View>

          <View style={styles.inputContainer}>
            <Input
              label="With Icon"
              placeholder="Search..."
              iconLeft={
                <Ionicons
                  name="search"
                  size={18}
                  color={colors.mutedForeground}
                />
              }
              testID="icon-input"
            />
          </View>

          <View style={styles.inputContainer}>
            <Input
              label="Disabled"
              value="Cannot edit this"
              disabled
              testID="disabled-input"
            />
          </View>
        </View>
      </View>

      {/* Badges Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Badges</Text>
        <Text style={styles.sectionDescription}>
          Small status or tag indicators.
        </Text>

        <View style={styles.badgesCard}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, styles.badgeDefault]}>
              <Text style={styles.badgeText}>Default</Text>
            </View>
            <View style={[styles.badge, styles.badgePrimary]}>
              <Text style={styles.badgeTextLight}>Active</Text>
            </View>
            <View style={[styles.badge, styles.badgeSuccess]}>
              <Text style={styles.badgeTextLight}>Completed</Text>
            </View>
          </View>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, styles.badgeWarning]}>
              <Text style={styles.badgeTextDark}>In Progress</Text>
            </View>
            <View style={[styles.badge, styles.badgeDestructive]}>
              <Text style={styles.badgeTextLight}>Critical</Text>
            </View>
            <View style={[styles.badge, styles.badgeOutline]}>
              <Text style={styles.badgeText}>Outline</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Switch & Toggle */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Switch & Toggle</Text>
        <Text style={styles.sectionDescription}>
          Boolean controls for settings and preferences.
        </Text>

        <View style={styles.toggleCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Enable GPU Acceleration</Text>
              <Text style={styles.toggleDescription}>
                Use hardware acceleration for better performance
              </Text>
            </View>
            <Switch
              value={switchValue}
              onValueChange={setSwitchValue}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.foreground}
            />
          </View>
        </View>
      </View>

      {/* Alerts Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alerts</Text>
        <Text style={styles.sectionDescription}>
          Semantic messaging for user feedback.
        </Text>

        <View style={styles.alertsContainer}>
          <View style={[styles.alert, styles.alertInfo]}>
            <Ionicons
              name="information-circle"
              size={20}
              color={colors.primary}
            />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>System Update</Text>
              <Text style={styles.alertMessage}>
                A new version is available for download.
              </Text>
            </View>
          </View>

          <View style={[styles.alert, styles.alertSuccess]}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.success}
            />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Success</Text>
              <Text style={styles.alertMessage}>
                Your changes have been saved.
              </Text>
            </View>
          </View>

          <View style={[styles.alert, styles.alertWarning]}>
            <Ionicons name="warning" size={20} color={colors.warning} />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Low Credits</Text>
              <Text style={styles.alertMessage}>
                You have less than 50 tokens remaining.
              </Text>
            </View>
          </View>

          <View style={[styles.alert, styles.alertDestructive]}>
            <Ionicons
              name="alert-circle"
              size={20}
              color={colors.destructive}
            />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Error</Text>
              <Text style={styles.alertMessage}>
                The AI model failed to initialize.
              </Text>
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
  cardGrid: {
    gap: spacing[4],
  },
  cardText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  inputCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputSectionTitle: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.foreground,
    marginBottom: spacing[3],
  },
  inputContainer: {
    marginBottom: spacing[4],
  },
  badgesCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing[3],
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  badge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  badgeDefault: {
    backgroundColor: colors.muted,
  },
  badgePrimary: {
    backgroundColor: colors.primary,
  },
  badgeSuccess: {
    backgroundColor: colors.success,
  },
  badgeWarning: {
    backgroundColor: colors.warning,
  },
  badgeDestructive: {
    backgroundColor: colors.destructive,
  },
  badgeOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.foreground,
  },
  badgeTextLight: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.background,
  },
  badgeTextDark: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.background,
  },
  toggleCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleInfo: {
    flex: 1,
    marginRight: spacing[3],
  },
  toggleLabel: {
    fontSize: fontSize.base,
    fontWeight: "500",
    color: colors.foreground,
  },
  toggleDescription: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing[1],
  },
  alertsContainer: {
    gap: spacing[3],
  },
  alert: {
    flexDirection: "row",
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    gap: spacing[3],
  },
  alertInfo: {
    backgroundColor: `${colors.primary}15`,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  alertSuccess: {
    backgroundColor: `${colors.success}15`,
    borderWidth: 1,
    borderColor: `${colors.success}30`,
  },
  alertWarning: {
    backgroundColor: `${colors.warning}15`,
    borderWidth: 1,
    borderColor: `${colors.warning}30`,
  },
  alertDestructive: {
    backgroundColor: `${colors.destructive}15`,
    borderWidth: 1,
    borderColor: `${colors.destructive}30`,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.foreground,
    marginBottom: spacing[1],
  },
  alertMessage: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
});
