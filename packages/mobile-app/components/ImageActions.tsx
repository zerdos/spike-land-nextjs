/**
 * ImageActions Component
 * Floating action bar for image viewer with download, share, delete buttons
 */

import { Download, Share2, Trash2 } from "@tamagui/lucide-icons";
import React, { useCallback, useEffect, useMemo } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, XStack } from "tamagui";

// ============================================================================
// Types
// ============================================================================

export interface ImageActionsProps {
  /** Whether the action bar is visible */
  visible: boolean;
  /** Callback when download button is pressed */
  onDownload: () => void;
  /** Callback when share button is pressed */
  onShare: () => void;
  /** Callback when delete button is pressed */
  onDelete: () => void;
  /** Whether download is in progress */
  isDownloading?: boolean;
  /** Whether share is in progress */
  isSharing?: boolean;
  /** Whether delete is in progress */
  isDeleting?: boolean;
  /** Whether to show delete button */
  showDelete?: boolean;
  /** Position of the action bar */
  position?: "top" | "bottom";
  /** Custom style for the container */
  style?: object;
}

// ============================================================================
// Constants
// ============================================================================

const ANIMATION_CONFIG = {
  damping: 20,
  stiffness: 300,
  mass: 0.8,
};

// ============================================================================
// Component
// ============================================================================

export function ImageActions({
  visible,
  onDownload,
  onShare,
  onDelete,
  isDownloading = false,
  isSharing = false,
  isDeleting = false,
  showDelete = true,
  position = "bottom",
  style,
}: ImageActionsProps) {
  const insets = useSafeAreaInsets();

  // Animation values
  const translateY = useSharedValue(position === "bottom" ? 100 : -100);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  // Calculate if any action is loading
  const isAnyLoading = useMemo(() => {
    return isDownloading || isSharing || isDeleting;
  }, [isDownloading, isSharing, isDeleting]);

  // Handle visibility animation
  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, ANIMATION_CONFIG);
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, ANIMATION_CONFIG);
    } else {
      translateY.value = withSpring(
        position === "bottom" ? 100 : -100,
        ANIMATION_CONFIG,
      );
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withSpring(0.9, ANIMATION_CONFIG);
    }
  }, [visible, position, translateY, opacity, scale]);

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  // Calculate position styles
  const positionStyles = useMemo(() => {
    if (position === "top") {
      return {
        top: insets.top + 60, // Below the header
        bottom: undefined,
      };
    }
    return {
      top: undefined,
      bottom: insets.bottom + 100, // Above the zoom controls
    };
  }, [position, insets]);

  // Handle button presses with loading state check
  const handleDownload = useCallback(() => {
    if (!isAnyLoading) {
      onDownload();
    }
  }, [isAnyLoading, onDownload]);

  const handleShare = useCallback(() => {
    if (!isAnyLoading) {
      onShare();
    }
  }, [isAnyLoading, onShare]);

  const handleDelete = useCallback(() => {
    if (!isAnyLoading) {
      onDelete();
    }
  }, [isAnyLoading, onDelete]);

  // Don't render if not visible and animation is complete
  if (!visible && opacity.value === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        positionStyles,
        animatedStyle,
        style,
      ]}
      pointerEvents={visible ? "auto" : "none"}
    >
      <XStack
        backgroundColor="rgba(0, 0, 0, 0.75)"
        borderRadius="$6"
        paddingHorizontal="$4"
        paddingVertical="$2"
        gap="$3"
        alignItems="center"
        shadowColor="black"
        shadowOffset={{ width: 0, height: 4 }}
        shadowOpacity={0.3}
        shadowRadius={8}
        elevation={10}
      >
        {/* Download Button */}
        <Button
          size="$4"
          chromeless
          circular
          icon={Download}
          color="white"
          onPress={handleDownload}
          disabled={isAnyLoading}
          opacity={isDownloading ? 0.7 : isAnyLoading ? 0.5 : 1}
          animation="quick"
          pressStyle={{ scale: 0.95, opacity: 0.8 }}
          testID="image-action-download"
        />

        {/* Share Button */}
        <Button
          size="$4"
          chromeless
          circular
          icon={Share2}
          color="white"
          onPress={handleShare}
          disabled={isAnyLoading}
          opacity={isSharing ? 0.7 : isAnyLoading ? 0.5 : 1}
          animation="quick"
          pressStyle={{ scale: 0.95, opacity: 0.8 }}
          testID="image-action-share"
        />

        {/* Delete Button */}
        {showDelete && (
          <Button
            size="$4"
            chromeless
            circular
            icon={Trash2}
            color="$red10"
            onPress={handleDelete}
            disabled={isAnyLoading}
            opacity={isDeleting ? 0.7 : isAnyLoading ? 0.5 : 1}
            animation="quick"
            pressStyle={{ scale: 0.95, opacity: 0.8 }}
            testID="image-action-delete"
          />
        )}
      </XStack>
    </Animated.View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
});
