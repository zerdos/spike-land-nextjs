/**
 * Avatar Component
 *
 * A circular avatar component for displaying user profile images
 * with fallback support for initials.
 */

import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";

import { colors } from "@/constants/theme";

export interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: number;
  style?: ViewStyle;
  fallbackStyle?: ViewStyle;
  testID?: string;
}

export function Avatar({
  src,
  alt = "User avatar",
  fallback = "?",
  size = 40,
  style,
  fallbackStyle,
  testID,
}: AvatarProps) {
  const [hasError, setHasError] = React.useState(false);

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const fontSize = Math.max(size * 0.4, 10);

  if (src && !hasError) {
    return (
      <View style={[styles.container, containerStyle, style]} testID={testID}>
        <Image
          source={src}
          style={styles.image}
          contentFit="cover"
          accessibilityLabel={alt}
          onError={() => setHasError(true)}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        styles.fallback,
        containerStyle,
        style,
        fallbackStyle,
      ]}
      testID={testID}
    >
      <Text style={[styles.fallbackText, { fontSize }]}>{fallback}</Text>
    </View>
  );
}

export interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  size?: number;
}

export function AvatarGroup(
  { children, max = 4, size = 40 }: AvatarGroupProps,
) {
  const childArray = React.Children.toArray(children);
  const visibleChildren = childArray.slice(0, max);
  const remainingCount = childArray.length - max;

  return (
    <View style={styles.group}>
      {visibleChildren.map((child, index) => {
        // Clone child Avatar elements and inject size prop if not already set
        const childWithSize = React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<AvatarProps>, {
            size: (child as React.ReactElement<AvatarProps>).props?.size ??
              size,
          })
          : child;

        return (
          <View
            key={index}
            style={[
              styles.groupItem,
              {
                marginLeft: index > 0 ? -(size * 0.3) : 0,
                zIndex: visibleChildren.length - index,
              },
            ]}
          >
            {childWithSize}
          </View>
        );
      })}
      {remainingCount > 0 && (
        <View
          style={[
            styles.container,
            styles.overflow,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: -(size * 0.3),
            },
          ]}
        >
          <Text style={[styles.overflowText, { fontSize: size * 0.3 }]}>
            +{remainingCount}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  fallback: {
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackText: {
    color: colors.foreground,
    fontWeight: "700",
  },
  group: {
    flexDirection: "row",
    alignItems: "center",
  },
  groupItem: {
    borderWidth: 2,
    borderColor: colors.background,
    borderRadius: 9999,
  },
  overflow: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  overflowText: {
    color: colors.foreground,
    fontWeight: "700",
  },
});
