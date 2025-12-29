/**
 * Mock for react-native-svg
 * Provides simple View-based mocks for SVG components
 */

import React from "react";
import { View } from "react-native";

// Create a mock component factory
const createSvgMock = (name: string) => {
  const Component = (
    { children, testID, ...props }: {
      children?: React.ReactNode;
      testID?: string;
      [key: string]: unknown;
    },
  ) => (
    <View testID={testID || `svg-${name.toLowerCase()}`} {...props}>
      {children}
    </View>
  );
  Component.displayName = name;
  return Component;
};

// Export all commonly used SVG components
export const Svg = createSvgMock("Svg");
export const Circle = createSvgMock("Circle");
export const Ellipse = createSvgMock("Ellipse");
export const G = createSvgMock("G");
export const Text = createSvgMock("Text");
export const TSpan = createSvgMock("TSpan");
export const TextPath = createSvgMock("TextPath");
export const Path = createSvgMock("Path");
export const Polygon = createSvgMock("Polygon");
export const Polyline = createSvgMock("Polyline");
export const Line = createSvgMock("Line");
export const Rect = createSvgMock("Rect");
export const Use = createSvgMock("Use");
export const Image = createSvgMock("Image");
export const Symbol = createSvgMock("Symbol");
export const Defs = createSvgMock("Defs");
export const LinearGradient = createSvgMock("LinearGradient");
export const RadialGradient = createSvgMock("RadialGradient");
export const Stop = createSvgMock("Stop");
export const ClipPath = createSvgMock("ClipPath");
export const Pattern = createSvgMock("Pattern");
export const Mask = createSvgMock("Mask");
export const Filter = createSvgMock("Filter");
export const FeGaussianBlur = createSvgMock("FeGaussianBlur");
export const FeMerge = createSvgMock("FeMerge");
export const FeMergeNode = createSvgMock("FeMergeNode");
export const FeOffset = createSvgMock("FeOffset");
export const FeBlend = createSvgMock("FeBlend");
export const FeColorMatrix = createSvgMock("FeColorMatrix");
export const FeComposite = createSvgMock("FeComposite");
export const FeFlood = createSvgMock("FeFlood");

// Default export
export default Svg;
