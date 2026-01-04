/**
 * Brand Page
 *
 * Displays brand assets for both spike.land platform and Pixel app,
 * including logos, icons, and brand guidelines.
 */

import { Ionicons } from "@expo/vector-icons";

import { ScrollView, StyleSheet, Text, View } from "react-native";

import { PixelLogo, SpikeLandLogo } from "@/components/brand";
import { Avatar, AvatarGroup } from "@/components/ui";
import { borderRadius, colors, fontSize, spacing } from "@/constants/theme";

const logoSizes = ["sm", "md", "lg", "xl"] as const;

export default function BrandPage() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Brand Identity</Text>
        <Text style={styles.subtitle}>
          The visual core of the spike.land design system, built on a foundation of digital
          precision and collaborative energy.
        </Text>
      </View>

      {/* AI Spark / Pixel Logo Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View
            style={[styles.headerIndicator, {
              backgroundColor: colors.primary,
            }]}
          />
          <View>
            <Text style={styles.sectionTitle}>AI Spark Logo</Text>
            <Text style={styles.sectionSubtitle}>
              The primary symbol of our creative tools. A 3x3 grid representing pixel arrays.
            </Text>
          </View>
        </View>

        {/* Pixel Logo Sizes */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sizes & Scale</Text>
          <Text style={styles.cardDescription}>
            Universal logo sizes for varying contexts.
          </Text>
          <View style={styles.logoRow}>
            {logoSizes.map((size) => (
              <View key={size} style={styles.logoItem}>
                <View style={styles.logoBox}>
                  <PixelLogo size={size} variant="icon" />
                </View>
                <View style={styles.sizeBadge}>
                  <Text style={styles.badgeText}>{size.toUpperCase()}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Pixel Logo Variants */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Structural Variants</Text>
          <Text style={styles.cardDescription}>
            Layout options for different requirements.
          </Text>

          <View style={styles.variantRow}>
            <PixelLogo size="md" variant="horizontal" />
            <View style={styles.variantBadge}>
              <Text style={styles.variantBadgeText}>HORIZONTAL</Text>
            </View>
          </View>

          <View style={styles.variantRow}>
            <PixelLogo size="lg" variant="icon" />
            <View style={styles.variantBadge}>
              <Text style={styles.variantBadgeText}>ICON ONLY</Text>
            </View>
          </View>

          <View style={[styles.variantRow, styles.stackedRow]}>
            <PixelLogo size="lg" variant="stacked" />
            <View style={styles.variantBadge}>
              <Text style={styles.variantBadgeText}>STACKED</Text>
            </View>
          </View>
        </View>
      </View>

      {/* spike.land Platform Logo Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View
            style={[styles.headerIndicator, { backgroundColor: "#FBBF24" }]}
          />
          <View>
            <Text style={styles.sectionTitle}>spike.land Platform Logo</Text>
            <Text style={styles.sectionSubtitle}>
              The parent platform identity featuring a lightning bolt icon.
            </Text>
          </View>
        </View>

        {/* spike.land Logo Sizes */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Platform Scale</Text>
          <Text style={styles.cardDescription}>
            Consistent sizing with the tool identity.
          </Text>
          <View style={styles.logoRow}>
            {logoSizes.map((size) => (
              <View key={size} style={styles.logoItem}>
                <View style={styles.logoBox}>
                  <SpikeLandLogo size={size} variant="icon" />
                </View>
                <View style={styles.sizeBadge}>
                  <Text style={styles.badgeText}>{size.toUpperCase()}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* spike.land Logo Variants */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Platform Layouts</Text>
          <Text style={styles.cardDescription}>
            Optimized for headers and banners.
          </Text>

          <View style={styles.variantRow}>
            <SpikeLandLogo size="md" variant="horizontal" />
            <View style={styles.variantBadge}>
              <Text style={styles.variantBadgeText}>HORIZONTAL</Text>
            </View>
          </View>

          <View
            style={[styles.variantRow, styles.stackedRow, styles.warningBg]}
          >
            <SpikeLandLogo size="lg" variant="stacked" />
            <View style={styles.variantBadge}>
              <Text style={styles.variantBadgeText}>STACKED</Text>
            </View>
          </View>
        </View>
      </View>

      {/* User Identity Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View
            style={[styles.headerIndicator, { backgroundColor: colors.accent }]}
          />
          <View>
            <Text style={styles.sectionTitle}>User Identity</Text>
            <Text style={styles.sectionSubtitle}>
              Avatar systems for representing users and automated agents across the platform.
            </Text>
          </View>
        </View>

        {/* Dynamic Sizing */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dynamic Sizing</Text>
          <Text style={styles.cardDescription}>
            Scale from small indicators to large headers.
          </Text>
          <View style={styles.avatarRow}>
            {[24, 32, 40, 48, 56].map((size, index) => (
              <View key={size} style={styles.avatarItem}>
                <Avatar
                  src="https://github.com/zerdos.png"
                  fallback="ZE"
                  size={size}
                  testID={`avatar-size-${size}`}
                />
                <Text style={styles.avatarLabel}>
                  H-{[8, 10, 12, 16, 20][index]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Fallback States */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fallback States</Text>
          <Text style={styles.cardDescription}>
            Graceful degradation when images are unavailable.
          </Text>
          <View style={styles.avatarFallbackRow}>
            <Avatar
              fallback="ZE"
              size={48}
              fallbackStyle={{ backgroundColor: colors.primary }}
              testID="avatar-fallback-primary"
            />
            <Avatar
              fallback="SP"
              size={48}
              fallbackStyle={styles.gradientFallback}
              testID="avatar-fallback-gradient"
            />
            <Avatar fallback="?" size={48} testID="avatar-fallback-unknown" />
            <AvatarGroup size={40}>
              <Avatar fallback="U1" size={40} />
              <Avatar fallback="U2" size={40} />
              <Avatar fallback="U3" size={40} />
              <Avatar fallback="U4" size={40} />
              <Avatar fallback="U5" size={40} />
            </AvatarGroup>
          </View>
        </View>
      </View>

      {/* Brand Colors Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View
            style={[styles.headerIndicator, {
              backgroundColor: colors.pixelFuchsia,
            }]}
          />
          <View>
            <Text style={styles.sectionTitle}>Brand Colors</Text>
            <Text style={styles.sectionSubtitle}>
              Core palette for the design system.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.colorRow}>
            <View
              style={[styles.colorSwatch, { backgroundColor: colors.primary }]}
            />
            <View style={styles.colorInfo}>
              <Text style={styles.colorName}>Pixel Cyan</Text>
              <Text style={styles.colorValue}>#00E5FF</Text>
            </View>
          </View>

          <View style={styles.colorRow}>
            <View
              style={[styles.colorSwatch, {
                backgroundColor: colors.pixelFuchsia,
              }]}
            />
            <View style={styles.colorInfo}>
              <Text style={styles.colorName}>Pixel Fuchsia</Text>
              <Text style={styles.colorValue}>#FF00FF</Text>
            </View>
          </View>

          <View style={styles.colorRow}>
            <View
              style={[styles.colorSwatch, { backgroundColor: "#FBBF24" }]}
            />
            <View style={styles.colorInfo}>
              <Text style={styles.colorName}>Spike Amber</Text>
              <Text style={styles.colorValue}>#FBBF24</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Usage Guidelines */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View
            style={[styles.headerIndicator, {
              backgroundColor: colors.success,
            }]}
          />
          <View>
            <Text style={styles.sectionTitle}>Usage Guidelines</Text>
            <Text style={styles.sectionSubtitle}>
              Best practices for brand consistency.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.guidelineItem}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.success}
            />
            <Text style={styles.guidelineText}>
              The AI Spark logo represents transformation and digital intelligence
            </Text>
          </View>
          <View style={styles.guidelineItem}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.success}
            />
            <Text style={styles.guidelineText}>
              Maintain clear space around the logo equivalent to the center spark size
            </Text>
          </View>
          <View style={styles.guidelineItem}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.success}
            />
            <Text style={styles.guidelineText}>
              Use the horizontal variant for navigation bars and wide headers
            </Text>
          </View>
          <View style={styles.guidelineItem}>
            <Ionicons
              name="close-circle"
              size={20}
              color={colors.destructive}
            />
            <Text style={styles.guidelineText}>
              Don't alter the logo colors or proportions
            </Text>
          </View>
          <View style={styles.guidelineItem}>
            <Ionicons
              name="close-circle"
              size={20}
              color={colors.destructive}
            />
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
    marginBottom: spacing[8],
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  headerIndicator: {
    width: 4,
    height: 28,
    borderRadius: 2,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: spacing[1],
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing[3],
  },
  cardTitle: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.foreground,
    marginBottom: spacing[1],
  },
  cardDescription: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing[4],
  },
  logoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[4],
    justifyContent: "flex-start",
  },
  logoItem: {
    alignItems: "center",
    gap: spacing[2],
  },
  logoBox: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[3],
    minWidth: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  sizeBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: borderRadius.sm,
    paddingVertical: 2,
    paddingHorizontal: spacing[2],
  },
  badgeText: {
    fontSize: 10,
    color: colors.mutedForeground,
    fontFamily: "monospace",
    fontWeight: "500",
  },
  variantRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  stackedRow: {
    flexDirection: "column",
    alignItems: "center",
    gap: spacing[3],
  },
  warningBg: {
    backgroundColor: "rgba(251, 191, 36, 0.05)",
  },
  variantBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: borderRadius.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing[2],
  },
  variantBadgeText: {
    fontSize: 10,
    color: colors.mutedForeground,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    marginBottom: spacing[3],
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
  guidelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  guidelineText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.foreground,
    lineHeight: 20,
  },
  avatarRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: spacing[4],
  },
  avatarItem: {
    alignItems: "center",
    gap: spacing[2],
  },
  avatarLabel: {
    fontSize: 9,
    color: colors.mutedForeground,
    fontFamily: "monospace",
    textTransform: "uppercase",
    letterSpacing: -0.5,
  },
  avatarFallbackRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing[4],
  },
  gradientFallback: {
    backgroundColor: colors.pixelFuchsia,
  },
});
