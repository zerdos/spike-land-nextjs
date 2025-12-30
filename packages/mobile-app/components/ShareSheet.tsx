/**
 * ShareSheet Component
 * Bottom sheet with sharing options for images
 */

import { Check, Copy, Download, Loader2, Share2, X } from "@tamagui/lucide-icons";
import React, { useCallback, useEffect, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H4, Progress, Separator, Text, XStack, YStack } from "tamagui";

import { useImageShare } from "@/hooks/useImageShare";

// ============================================================================
// Types
// ============================================================================

export interface ShareSheetProps {
  /** Whether the sheet is visible */
  visible: boolean;
  /** The image ID to share */
  imageId: string | null;
  /** Callback when sheet is closed */
  onClose: () => void;
  /** Callback when any action completes successfully */
  onActionComplete?: (action: "share" | "download" | "copy") => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

interface SocialPlatform {
  id: string;
  name: string;
  icon: string;
  urlScheme: string;
  webUrl: string;
}

// ============================================================================
// Constants
// ============================================================================

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  {
    id: "twitter",
    name: "Twitter",
    icon: "X",
    urlScheme: "twitter://post?message=",
    webUrl: "https://twitter.com/intent/tweet?text=",
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: "camera",
    urlScheme: "instagram://",
    webUrl: "https://instagram.com",
  },
];

const SHEET_HEIGHT = 400;

// ============================================================================
// Component
// ============================================================================

export function ShareSheet({
  visible,
  imageId,
  onClose,
  onActionComplete,
  onError,
}: ShareSheetProps) {
  const insets = useSafeAreaInsets();
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Animation values
  const translateY = useSharedValue(SHEET_HEIGHT);
  const opacity = useSharedValue(0);

  // Image share hook
  const {
    shareImage,
    downloadImage,
    copyLink,
    isLoading,
    currentOperation,
    downloadProgress,
    error,
    isSharingAvailable,
  } = useImageShare({
    onDownloadComplete: () => {
      setDownloadSuccess(true);
      onActionComplete?.("download");
      setTimeout(() => setDownloadSuccess(false), 2000);
    },
    onShareComplete: () => {
      onActionComplete?.("share");
    },
    onLinkCopied: () => {
      setCopiedSuccess(true);
      onActionComplete?.("copy");
      setTimeout(() => setCopiedSuccess(false), 2000);
    },
    onError: (err) => {
      onError?.(err);
    },
  });

  // Handle visibility animation
  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withSpring(SHEET_HEIGHT, {
        damping: 20,
        stiffness: 200,
      });
    }
  }, [visible, opacity, translateY]);

  // Handle backdrop tap
  const handleBackdropPress = useCallback(() => {
    if (!isLoading) {
      onClose();
    }
  }, [isLoading, onClose]);

  // Handle close button
  const handleClose = useCallback(() => {
    if (!isLoading) {
      onClose();
    }
  }, [isLoading, onClose]);

  // Handle download
  const handleDownload = useCallback(async () => {
    if (!imageId || isLoading) return;
    await downloadImage(imageId);
  }, [imageId, isLoading, downloadImage]);

  // Handle share
  const handleShare = useCallback(async () => {
    if (!imageId || isLoading) return;
    await shareImage(imageId);
  }, [imageId, isLoading, shareImage]);

  // Handle copy link
  const handleCopyLink = useCallback(async () => {
    if (!imageId || isLoading) return;
    await copyLink(imageId);
  }, [imageId, isLoading, copyLink]);

  // Handle social share
  const handleSocialShare = useCallback(
    async (platform: SocialPlatform) => {
      if (!imageId) return;

      // First get the share link
      const success = await copyLink(imageId);
      if (!success) return;

      // Try to open the app, fall back to web
      const canOpen = await Linking.canOpenURL(platform.urlScheme);

      if (canOpen && Platform.OS !== "web") {
        await Linking.openURL(platform.urlScheme);
      } else {
        await Linking.openURL(platform.webUrl);
      }
    },
    [imageId, copyLink],
  );

  // Animated styles
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * 0.5,
    pointerEvents: visible ? "auto" : "none",
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible && translateY.value === SHEET_HEIGHT) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable
          style={styles.backdropPressable}
          onPress={handleBackdropPress}
        />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[styles.sheet, sheetStyle, {
          paddingBottom: insets.bottom + 16,
        }]}
      >
        {/* Header */}
        <XStack
          justifyContent="space-between"
          alignItems="center"
          paddingHorizontal="$4"
        >
          <H4>Share Image</H4>
          <Button
            size="$3"
            chromeless
            circular
            icon={X}
            onPress={handleClose}
            disabled={isLoading}
            opacity={isLoading ? 0.5 : 1}
          />
        </XStack>

        <Separator marginVertical="$3" />

        {/* Error Message */}
        {error && (
          <YStack paddingHorizontal="$4" paddingBottom="$3">
            <Text color="$red10" fontSize="$2">
              {error}
            </Text>
          </YStack>
        )}

        {/* Main Actions */}
        <YStack gap="$3" paddingHorizontal="$4">
          {/* Download to Device */}
          <Button
            size="$5"
            theme={downloadSuccess ? "green" : "blue"}
            icon={currentOperation === "download" && isLoading
              ? Loader2
              : downloadSuccess
              ? Check
              : Download}
            onPress={handleDownload}
            disabled={isLoading}
            opacity={isLoading && currentOperation !== "download" ? 0.5 : 1}
          >
            {currentOperation === "download" && isLoading
              ? `Downloading... ${downloadProgress}%`
              : downloadSuccess
              ? "Downloaded!"
              : "Save to Device"}
          </Button>

          {/* Download Progress */}
          {currentOperation === "download" && isLoading &&
            downloadProgress > 0 && (
            <Progress
              value={downloadProgress}
              backgroundColor="$gray4"
              height={4}
            >
              <Progress.Indicator
                animation="bouncy"
                backgroundColor="$blue10"
              />
            </Progress>
          )}

          {/* Share via Native Sheet */}
          {isSharingAvailable && (
            <Button
              size="$5"
              variant="outlined"
              icon={currentOperation === "share" && isLoading
                ? Loader2
                : Share2}
              onPress={handleShare}
              disabled={isLoading}
              opacity={isLoading && currentOperation !== "share" ? 0.5 : 1}
            >
              {currentOperation === "share" && isLoading
                ? "Sharing..."
                : "Share via..."}
            </Button>
          )}

          {/* Copy Link */}
          <Button
            size="$5"
            variant="outlined"
            theme={copiedSuccess ? "green" : undefined}
            icon={currentOperation === "copy" && isLoading
              ? Loader2
              : copiedSuccess
              ? Check
              : Copy}
            onPress={handleCopyLink}
            disabled={isLoading}
            opacity={isLoading && currentOperation !== "copy" ? 0.5 : 1}
          >
            {currentOperation === "copy" && isLoading
              ? "Copying..."
              : copiedSuccess
              ? "Link Copied!"
              : "Copy Link"}
          </Button>
        </YStack>

        <Separator marginVertical="$3" />

        {/* Social Platforms */}
        <YStack paddingHorizontal="$4">
          <Text color="$gray10" fontSize="$2" marginBottom="$2">
            Quick Share
          </Text>
          <XStack gap="$3" flexWrap="wrap">
            {SOCIAL_PLATFORMS.map((platform) => (
              <Button
                key={platform.id}
                size="$4"
                variant="outlined"
                onPress={() => handleSocialShare(platform)}
                disabled={isLoading}
                opacity={isLoading ? 0.5 : 1}
                minWidth={100}
              >
                {platform.name}
              </Button>
            ))}
          </XStack>
        </YStack>
      </Animated.View>
    </>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "black",
    zIndex: 100,
  },
  backdropPressable: {
    flex: 1,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    zIndex: 101,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
});
