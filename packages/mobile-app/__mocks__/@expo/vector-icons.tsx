/**
 * Mock for @expo/vector-icons
 * Provides a simple Text-based mock for all icon components
 */

import React from "react";
import { Text, View } from "react-native";

// Create a mock icon component factory
const createIconMock = (iconSetName: string) => {
  const IconComponent = ({
    name,
    size = 24,
    color = "#000",
    testID,
    ...props
  }: {
    name: string;
    size?: number;
    color?: string;
    testID?: string;
    [key: string]: unknown;
  }) => (
    <View
      testID={testID || `${iconSetName}-icon-${name}`}
      style={{ width: size, height: size }}
      {...props}
    >
      <Text style={{ color, fontSize: size / 2 }}>{name}</Text>
    </View>
  );

  IconComponent.displayName = iconSetName;
  return IconComponent;
};

// Export all commonly used icon sets
export const Ionicons = createIconMock("Ionicons");
export const MaterialIcons = createIconMock("MaterialIcons");
export const MaterialCommunityIcons = createIconMock("MaterialCommunityIcons");
export const FontAwesome = createIconMock("FontAwesome");
export const FontAwesome5 = createIconMock("FontAwesome5");
export const Feather = createIconMock("Feather");
export const AntDesign = createIconMock("AntDesign");
export const Entypo = createIconMock("Entypo");
export const Foundation = createIconMock("Foundation");
export const Octicons = createIconMock("Octicons");
export const SimpleLineIcons = createIconMock("SimpleLineIcons");
export const Zocial = createIconMock("Zocial");

// Default export for when the entire module is imported
export default {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
  FontAwesome,
  FontAwesome5,
  Feather,
  AntDesign,
  Entypo,
  Foundation,
  Octicons,
  SimpleLineIcons,
  Zocial,
};
