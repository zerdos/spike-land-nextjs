/**
 * FeatureCard Component
 * Glass morphism styled card for displaying feature highlights
 */

import type { ReactNode } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import { Card, Paragraph, Text, View, XStack, YStack } from "tamagui";

export type FeatureCardVariant = "purple" | "yellow" | "blue" | "green";

interface FeatureCardProps {
  /**
   * Icon component from Lucide icons
   */
  icon: ReactNode;
  /**
   * Title of the feature
   */
  title: string;
  /**
   * Description of the feature
   */
  description: string;
  /**
   * Color variant for the icon background
   */
  variant?: FeatureCardVariant;
  /**
   * Optional test ID for testing
   */
  testID?: string;
  /**
   * Optional onPress handler
   */
  onPress?: () => void;
}

// Gradient color mapping for icon backgrounds
const variantColors: Record<FeatureCardVariant, { start: string; end: string; }> = {
  purple: { start: "#A855F7", end: "#EC4899" },
  yellow: { start: "#EAB308", end: "#F97316" },
  blue: { start: "#3B82F6", end: "#06B6D4" },
  green: { start: "#22C55E", end: "#10B981" },
};

// Solid colors for native (gradient fallback)
const variantSolidColors: Record<FeatureCardVariant, string> = {
  purple: "#A855F7",
  yellow: "#EAB308",
  blue: "#3B82F6",
  green: "#22C55E",
};

export function FeatureCard({
  icon,
  title,
  description,
  variant = "blue",
  testID,
  onPress,
}: FeatureCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const iconBackgroundColor = variantSolidColors[variant];

  return (
    <Card
      elevate
      bordered
      padding="$4"
      backgroundColor={isDark ? "rgba(30, 30, 40, 0.6)" : "rgba(255, 255, 255, 0.8)"}
      borderColor={isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"}
      borderRadius="$4"
      pressStyle={onPress ? { scale: 0.98, opacity: 0.9 } : undefined}
      onPress={onPress}
      style={styles.card}
      testID={testID}
    >
      <YStack gap="$3">
        {/* Icon Container */}
        <View
          backgroundColor={iconBackgroundColor}
          width={56}
          height={56}
          borderRadius="$4"
          alignItems="center"
          justifyContent="center"
          style={styles.iconContainer}
          testID={`${testID}-icon`}
        >
          {icon}
        </View>

        {/* Title */}
        <Text
          fontSize="$5"
          fontWeight="600"
          color={isDark ? "white" : "$gray12"}
          testID={`${testID}-title`}
        >
          {title}
        </Text>

        {/* Description */}
        <Paragraph
          fontSize="$3"
          color={isDark ? "$gray10" : "$gray11"}
          lineHeight="$4"
          testID={`${testID}-description`}
        >
          {description}
        </Paragraph>
      </YStack>
    </Card>
  );
}

/**
 * Pre-configured feature cards for the landing screen
 */
export interface FeatureData {
  icon: ReactNode;
  title: string;
  description: string;
  variant: FeatureCardVariant;
}

export function createFeatureCards(IconComponents: {
  Clock: React.ComponentType<{ size?: number; color?: string; }>;
  Image: React.ComponentType<{ size?: number; color?: string; }>;
  Layers: React.ComponentType<{ size?: number; color?: string; }>;
  Coins: React.ComponentType<{ size?: number; color?: string; }>;
}): FeatureData[] {
  const { Clock, Image, Layers, Coins } = IconComponents;

  return [
    {
      icon: <Clock size={24} color="white" />,
      title: "60-Second Magic",
      description: "Upload. Enhance. Download. Your photo is ready before your coffee.",
      variant: "purple",
    },
    {
      icon: <Image size={24} color="white" />,
      title: "Print-Ready 4K",
      description: "Good enough to frame. Crystal-clear resolution for any screen or print.",
      variant: "yellow",
    },
    {
      icon: <Layers size={24} color="white" />,
      title: "Batch Albums",
      description: "Restore 100 photos at once. Perfect for family reunions and wedding albums.",
      variant: "blue",
    },
    {
      icon: <Coins size={24} color="white" />,
      title: "Free Tokens",
      description: "Tokens regenerate every 15 minutes. No credit card ever required.",
      variant: "green",
    },
  ];
}

const styles = StyleSheet.create({
  card: {
    // Glass morphism effect
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  iconContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default FeatureCard;
