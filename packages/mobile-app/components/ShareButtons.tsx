/**
 * ShareButtons Component
 * Share referral link via clipboard, native share, and social media
 */

import { REFERRAL_CONFIG } from "@spike-npm-land/shared";
import { Copy, Facebook, MessageCircle, Share2, Twitter } from "@tamagui/lucide-icons";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import React, { useCallback, useState } from "react";
import { Alert, Linking } from "react-native";
import { Button, XStack, YStack } from "tamagui";

// ============================================================================
// Types
// ============================================================================

export interface ShareButtonsProps {
  referralUrl: string;
  referralCode: string;
  onCopySuccess?: () => void;
  onShareSuccess?: () => void;
  onShareError?: (error: Error) => void;
}

// ============================================================================
// Social Share URLs
// ============================================================================

function getTwitterShareUrl(referralUrl: string): string {
  const text =
    `Join me on Spike and get ${REFERRAL_CONFIG.SIGNUP_BONUS_TOKENS} free tokens! Use my referral link:`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${
    encodeURIComponent(referralUrl)
  }`;
}

function getFacebookShareUrl(referralUrl: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}`;
}

function getWhatsAppShareUrl(referralUrl: string): string {
  const text =
    `Join me on Spike and get ${REFERRAL_CONFIG.SIGNUP_BONUS_TOKENS} free tokens! ${referralUrl}`;
  return `whatsapp://send?text=${encodeURIComponent(text)}`;
}

// ============================================================================
// Main Component
// ============================================================================

export function ShareButtons({
  referralUrl,
  referralCode: _referralCode,
  onCopySuccess,
  onShareSuccess,
  onShareError,
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Copy link to clipboard
  const handleCopyLink = useCallback(async () => {
    if (!referralUrl) return;

    try {
      await Clipboard.setStringAsync(referralUrl);
      setCopied(true);
      onCopySuccess?.();

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Failed to copy");
      onShareError?.(err);
      Alert.alert("Error", "Failed to copy link to clipboard");
    }
  }, [referralUrl, onCopySuccess, onShareError]);

  // Native share sheet
  const handleNativeShare = useCallback(async () => {
    if (!referralUrl || isSharing) return;

    setIsSharing(true);

    try {
      const isAvailable = await Sharing.isAvailableAsync();

      if (isAvailable) {
        await Sharing.shareAsync(referralUrl, {
          dialogTitle: "Share your referral link",
          UTI: "public.url",
        });
        onShareSuccess?.();
      } else {
        // Fallback to clipboard
        await handleCopyLink();
        Alert.alert(
          "Link Copied",
          "Native sharing is not available on this device. Your referral link has been copied to the clipboard.",
        );
      }
    } catch (error) {
      // User cancelled sharing - this is not an error
      if (error instanceof Error && error.message.includes("cancelled")) {
        return;
      }
      const err = error instanceof Error ? error : new Error("Share failed");
      onShareError?.(err);
    } finally {
      setIsSharing(false);
    }
  }, [referralUrl, isSharing, handleCopyLink, onShareSuccess, onShareError]);

  // Social media share handlers
  const handleTwitterShare = useCallback(async () => {
    if (!referralUrl) return;

    try {
      const twitterUrl = getTwitterShareUrl(referralUrl);
      const canOpen = await Linking.canOpenURL(twitterUrl);

      if (canOpen) {
        await Linking.openURL(twitterUrl);
        onShareSuccess?.();
      } else {
        // Fallback to web URL
        await Linking.openURL(
          `https://twitter.com/intent/tweet?text=${
            encodeURIComponent(
              `Join me on Spike and get ${REFERRAL_CONFIG.SIGNUP_BONUS_TOKENS} free tokens!`,
            )
          }&url=${encodeURIComponent(referralUrl)}`,
        );
        onShareSuccess?.();
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Twitter share failed");
      onShareError?.(err);
      Alert.alert("Error", "Failed to open Twitter");
    }
  }, [referralUrl, onShareSuccess, onShareError]);

  const handleFacebookShare = useCallback(async () => {
    if (!referralUrl) return;

    try {
      const facebookUrl = getFacebookShareUrl(referralUrl);
      await Linking.openURL(facebookUrl);
      onShareSuccess?.();
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Facebook share failed");
      onShareError?.(err);
      Alert.alert("Error", "Failed to open Facebook");
    }
  }, [referralUrl, onShareSuccess, onShareError]);

  const handleWhatsAppShare = useCallback(async () => {
    if (!referralUrl) return;

    try {
      const whatsappUrl = getWhatsAppShareUrl(referralUrl);
      const canOpen = await Linking.canOpenURL(whatsappUrl);

      if (canOpen) {
        await Linking.openURL(whatsappUrl);
        onShareSuccess?.();
      } else {
        // Fallback to web WhatsApp
        const webWhatsAppUrl = `https://wa.me/?text=${
          encodeURIComponent(
            `Join me on Spike and get ${REFERRAL_CONFIG.SIGNUP_BONUS_TOKENS} free tokens! ${referralUrl}`,
          )
        }`;
        await Linking.openURL(webWhatsAppUrl);
        onShareSuccess?.();
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error("WhatsApp share failed");
      onShareError?.(err);
      Alert.alert("Error", "Failed to open WhatsApp");
    }
  }, [referralUrl, onShareSuccess, onShareError]);

  const isDisabled = !referralUrl;

  return (
    <YStack gap="$3" testID="share-buttons">
      {/* Primary Actions Row */}
      <XStack gap="$2" testID="primary-actions">
        <Button
          flex={1}
          backgroundColor="$blue9"
          icon={copied ? undefined : <Copy size={18} />}
          onPress={handleCopyLink}
          disabled={isDisabled}
          testID="copy-button"
        >
          {copied ? "Copied!" : "Copy Link"}
        </Button>
        <Button
          flex={1}
          backgroundColor="$green9"
          icon={<Share2 size={18} />}
          onPress={handleNativeShare}
          disabled={isDisabled || isSharing}
          testID="share-button"
        >
          {isSharing ? "Sharing..." : "Share"}
        </Button>
      </XStack>

      {/* Social Media Row */}
      <XStack gap="$2" testID="social-actions">
        <Button
          flex={1}
          size="$4"
          backgroundColor="$blue9"
          icon={<Twitter size={18} color="white" />}
          onPress={handleTwitterShare}
          disabled={isDisabled}
          testID="twitter-button"
        >
          Twitter
        </Button>
        <Button
          flex={1}
          size="$4"
          backgroundColor="$blue8"
          icon={<Facebook size={18} color="white" />}
          onPress={handleFacebookShare}
          disabled={isDisabled}
          testID="facebook-button"
        >
          Facebook
        </Button>
        <Button
          flex={1}
          size="$4"
          backgroundColor="$green9"
          icon={<MessageCircle size={18} color="white" />}
          onPress={handleWhatsAppShare}
          disabled={isDisabled}
          testID="whatsapp-button"
        >
          WhatsApp
        </Button>
      </XStack>
    </YStack>
  );
}

export default ShareButtons;
