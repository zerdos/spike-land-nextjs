/**
 * Spike Land Logo Component
 *
 * The parent platform identity featuring a lightning bolt icon
 * that represents the speed and energy of the underlying infrastructure.
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/theme";

export interface SpikeLandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "icon" | "horizontal" | "stacked";
  showText?: boolean;
}

const sizeMap = {
  sm: { icon: 24, fontSize: 16, gap: 6 },
  md: { icon: 32, fontSize: 20, gap: 8 },
  lg: { icon: 48, fontSize: 24, gap: 10 },
  xl: { icon: 64, fontSize: 32, gap: 12 },
};

export function SpikeLandLogo({
  size = "md",
  variant = "horizontal",
  showText = true,
}: SpikeLandLogoProps) {
  const { icon, fontSize, gap } = sizeMap[size];

  const zapIcon = (
    <Ionicons
      name="flash"
      size={icon}
      color="#FBBF24"
      testID="spike-land-logo-icon"
    />
  );

  const wordmark = <Text style={[styles.wordmark, { fontSize }]}>spike.land</Text>;

  if (variant === "icon" || !showText) {
    return <View style={styles.container}>{zapIcon}</View>;
  }

  if (variant === "stacked") {
    return (
      <View style={styles.stackedContainer}>
        {zapIcon}
        {wordmark}
      </View>
    );
  }

  return (
    <View style={[styles.horizontalContainer, { gap }]}>
      {zapIcon}
      {wordmark}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  horizontalContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  stackedContainer: {
    alignItems: "center",
    gap: 8,
  },
  wordmark: {
    fontWeight: "700",
    color: colors.foreground,
    letterSpacing: -0.5,
    textTransform: "lowercase",
  },
});
