/**
 * Pixel Logo Component
 *
 * The AI Spark logo - a 3x3 grid representing pixel arrays with a glowing center
 * symbolizing the AI enhancement layer.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, {
  Defs,
  FeGaussianBlur,
  FeMerge,
  FeMergeNode,
  Filter,
  G,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

import { colors } from "@/constants/theme";

export interface PixelLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "icon" | "horizontal" | "stacked";
  showText?: boolean;
}

const sizeMap = {
  sm: { grid: 32, fontSize: 16, gap: 6 },
  md: { grid: 48, fontSize: 20, gap: 8 },
  lg: { grid: 64, fontSize: 24, gap: 10 },
  xl: { grid: 96, fontSize: 32, gap: 12 },
};

// Constants for grid cell calculations
const GAP_RATIO = 0.12;
const CORNER_RATIO = 0.18;

export function PixelLogo({
  size = "md",
  variant = "horizontal",
  showText = true,
}: PixelLogoProps) {
  const { grid, fontSize, gap } = sizeMap[size];
  const cellSize = grid / 3;
  const cellGap = cellSize * GAP_RATIO;
  const cornerRadius = cellSize * CORNER_RATIO;
  const rectSize = cellSize - cellGap;

  const gridIcon = (
    <Svg width={grid} height={grid} viewBox={`0 0 ${grid} ${grid}`}>
      <Defs>
        <Filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
          <FeGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <FeMerge>
            <FeMergeNode in="coloredBlur" />
            <FeMergeNode in="SourceGraphic" />
          </FeMerge>
        </Filter>
        <RadialGradient id="sparkGradient" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="30%" stopColor="#00E5FF" />
          <Stop offset="70%" stopColor="#FF00FF" stopOpacity={0.9} />
          <Stop offset="100%" stopColor="#FF00FF" stopOpacity={0.7} />
        </RadialGradient>
        <LinearGradient id="sparkShine" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.7} />
          <Stop offset="40%" stopColor="#00E5FF" stopOpacity={0.3} />
          <Stop offset="100%" stopColor="#FF00FF" stopOpacity={0.4} />
        </LinearGradient>
      </Defs>

      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => {
          const isCenter = row === 1 && col === 1;
          const x = col * cellSize + cellGap / 2;
          const y = row * cellSize + cellGap / 2;

          if (isCenter) {
            return (
              <G key={`${row}-${col}`}>
                <Rect
                  x={x}
                  y={y}
                  width={rectSize}
                  height={rectSize}
                  rx={cornerRadius}
                  fill="url(#sparkGradient)"
                />
                <Rect
                  x={x}
                  y={y}
                  width={rectSize}
                  height={rectSize}
                  rx={cornerRadius}
                  fill="url(#sparkShine)"
                />
              </G>
            );
          }

          return (
            <Rect
              key={`${row}-${col}`}
              x={x}
              y={y}
              width={rectSize}
              height={rectSize}
              rx={cornerRadius}
              fill="rgba(255, 255, 255, 0.15)"
            />
          );
        })
      )}
    </Svg>
  );

  const wordmark = <Text style={[styles.wordmark, { fontSize }]}>pixel</Text>;

  if (variant === "icon" || !showText) {
    return <View style={styles.container}>{gridIcon}</View>;
  }

  if (variant === "stacked") {
    return (
      <View style={styles.stackedContainer}>
        {gridIcon}
        {wordmark}
      </View>
    );
  }

  return (
    <View style={[styles.horizontalContainer, { gap }]}>
      {gridIcon}
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
