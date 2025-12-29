/**
 * Storybook Layout
 *
 * Layout wrapper for the mobile storybook section with navigation drawer.
 * Mirrors the web app's storybook layout structure.
 */

import { Ionicons } from "@expo/vector-icons";
import { Drawer } from "expo-router/drawer";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fontSize, spacing } from "@/constants/theme";

/**
 * Storybook sections configuration matching web app
 */
export const storybookSections = [
  {
    id: "brand",
    label: "Brand",
    category: "Foundation",
    description: "Logo variants, sizes, and the spike.land AI Spark logo",
    icon: "sparkles-outline" as const,
  },
  {
    id: "colors",
    label: "Colors",
    category: "Foundation",
    description: "Color palette, brand colors, dark/light modes, glow effects",
    icon: "color-palette-outline" as const,
  },
  {
    id: "typography",
    label: "Typography",
    category: "Foundation",
    description: "Font families, heading scale, text colors",
    icon: "text-outline" as const,
  },
  {
    id: "surfaces",
    label: "Surfaces",
    category: "Foundation",
    description: "Glass-morphism tiers, elevation system, and transparency",
    icon: "layers-outline" as const,
  },
  {
    id: "buttons",
    label: "Buttons",
    category: "Actions",
    description: "Button variants, sizes, states, loading indicators",
    icon: "hand-left-outline" as const,
  },
  {
    id: "components",
    label: "Components",
    category: "Elements",
    description: "Cards, badges, inputs, accordion, tabs, textarea, tooltip, slider",
    icon: "cube-outline" as const,
  },
  {
    id: "data-display",
    label: "Data Display",
    category: "Data",
    description: "Tables, toggle groups, and copy buttons",
    icon: "grid-outline" as const,
  },
  {
    id: "layout",
    label: "Layout",
    category: "Structure",
    description: "Masonry grid, text overlays, and zoom controls",
    icon: "apps-outline" as const,
  },
  {
    id: "comparison",
    label: "Comparison",
    category: "Elements",
    description: "Image comparison slider, comparison view toggle",
    icon: "swap-horizontal-outline" as const,
  },
  {
    id: "feedback",
    label: "Feedback",
    category: "Status",
    description: "Toast notifications, alerts, semantic state colors",
    icon: "notifications-outline" as const,
  },
  {
    id: "loading",
    label: "Loading",
    category: "Status",
    description: "Skeleton loaders, progress bars, spinners/animations",
    icon: "hourglass-outline" as const,
  },
  {
    id: "modals",
    label: "Modals",
    category: "Overlays",
    description: "Dialogs, dropdown menus, sheets, alert dialogs",
    icon: "albums-outline" as const,
  },
  {
    id: "accessibility",
    label: "Accessibility",
    category: "Principles",
    description: "Contrast checker, keyboard navigation, ARIA attributes",
    icon: "accessibility-outline" as const,
  },
  {
    id: "merch",
    label: "Merch",
    category: "Features",
    description: "Print-on-demand merchandise components",
    icon: "bag-outline" as const,
  },
  {
    id: "photo-mix",
    label: "PhotoMix",
    category: "Features",
    description: "Photo mixing and blending components",
    icon: "images-outline" as const,
  },
  {
    id: "auth",
    label: "Auth",
    category: "Systems",
    description: "Authentication components, buttons, and user avatars",
    icon: "shield-checkmark-outline" as const,
  },
  {
    id: "errors",
    label: "Errors",
    category: "Systems",
    description: "Error handling components and error boundaries",
    icon: "warning-outline" as const,
  },
] as const;

/**
 * Custom drawer content component
 */
function CustomDrawerContent({
  navigation,
  state,
}: {
  navigation: { navigate: (name: string) => void; };
  state: { index: number; routeNames: string[]; };
}) {
  const insets = useSafeAreaInsets();

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
  const currentRoute = state.routeNames[state.index];

  return (
    <View style={[styles.drawerContainer, { paddingTop: insets.top }]}>
      {/* Header */}
      <Pressable style={styles.header} onPress={() => navigation.navigate("index")}>
        <Text style={styles.headerTitle}>Design System</Text>
        <Text style={styles.headerSubtitle}>spike.land design system</Text>
      </Pressable>

      {/* Overview Link */}
      <Pressable
        style={[styles.navItem, currentRoute === "index" && styles.navItemActive]}
        onPress={() => navigation.navigate("index")}
      >
        <Ionicons
          name="compass-outline"
          size={18}
          color={currentRoute === "index" ? colors.primary : colors.mutedForeground}
        />
        <Text style={[styles.navItemText, currentRoute === "index" && styles.navItemTextActive]}>
          Overview
        </Text>
      </Pressable>

      {/* Scrollable Navigation */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {categories.map((category) => (
          <View key={category} style={styles.categoryContainer}>
            <Text style={styles.categoryTitle}>{category}</Text>
            {groupedSections[category]?.map((section) => {
              const isActive = currentRoute === section.id;
              return (
                <Pressable
                  key={section.id}
                  style={[styles.navItem, isActive && styles.navItemActive]}
                  onPress={() => navigation.navigate(section.id)}
                >
                  <Ionicons
                    name={section.icon}
                    size={18}
                    color={isActive ? colors.primary : colors.mutedForeground}
                  />
                  <Text style={[styles.navItemText, isActive && styles.navItemTextActive]}>
                    {section.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.versionContainer}>
          <View style={styles.versionDot} />
          <Text style={styles.versionText}>Version 1.2.0</Text>
        </View>
        <Text style={styles.copyrightText}>Built for Spike Land Platform</Text>
        <Text style={styles.copyrightText}>&copy; {new Date().getFullYear()} spike.land</Text>
      </View>
    </View>
  );
}

/**
 * Storybook Layout Component
 */
export default function StorybookLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => (
          <CustomDrawerContent navigation={props.navigation} state={props.state} />
        )}
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.foreground,
          headerTitleStyle: {
            fontWeight: "600",
          },
          drawerStyle: {
            backgroundColor: colors.background,
            width: 280,
          },
          drawerType: Platform.OS === "web" ? "permanent" : "front",
        }}
      >
        <Drawer.Screen
          name="index"
          options={{
            title: "Design System",
            drawerLabel: "Overview",
          }}
        />
        {storybookSections.map((section) => (
          <Drawer.Screen
            key={section.id}
            name={section.id}
            options={{
              title: section.label,
              drawerLabel: section.label,
            }}
          />
        ))}
      </Drawer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.primary,
  },
  headerSubtitle: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginTop: spacing[1],
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing[3],
  },
  categoryContainer: {
    marginVertical: spacing[3],
  },
  categoryTitle: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: spacing[2],
    paddingHorizontal: spacing[2],
    opacity: 0.6,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[3],
    borderRadius: 12,
    marginVertical: 2,
  },
  navItemActive: {
    backgroundColor: `${colors.primary}20`,
  },
  navItemText: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: colors.mutedForeground,
  },
  navItemTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  footer: {
    padding: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  versionContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  versionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  versionText: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  copyrightText: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    opacity: 0.5,
  },
});
