/**
 * Upload Flow Screen
 * Camera capture and gallery picker with image preview
 */

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Dimensions, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button,
  Card,
  H3,
  Paragraph,
  ScrollView,
  Spinner,
  Text,
  View,
  XStack,
  YStack,
} from "tamagui";

import { type SelectedImage, useImagePicker } from "../../hooks";
import { useEnhancementStore } from "../../stores";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_PREVIEW_SIZE = SCREEN_WIDTH - 64;

// ============================================================================
// Image Source Button Component
// ============================================================================

interface SourceButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  disabled?: boolean;
}

function SourceButton({ icon, title, subtitle, onPress, disabled }: SourceButtonProps) {
  return (
    <Card
      elevate
      bordered
      flex={1}
      padding="$4"
      pressStyle={{ scale: 0.98, opacity: 0.8 }}
      onPress={onPress}
      opacity={disabled ? 0.5 : 1}
      disabled={disabled}
    >
      <YStack alignItems="center" gap="$2">
        <View
          backgroundColor="$blue5"
          borderRadius="$6"
          padding="$3"
        >
          <Ionicons name={icon} size={32} color="#3B82F6" />
        </View>
        <Text fontSize="$4" fontWeight="600">
          {title}
        </Text>
        <Text fontSize="$2" color="$gray10" textAlign="center">
          {subtitle}
        </Text>
      </YStack>
    </Card>
  );
}

// ============================================================================
// Image Preview Component
// ============================================================================

interface ImagePreviewProps {
  image: SelectedImage;
  onRemove: () => void;
}

function ImagePreview({ image, onRemove }: ImagePreviewProps) {
  return (
    <YStack alignItems="center" gap="$3">
      <View position="relative">
        <Card elevate bordered overflow="hidden" borderRadius="$4">
          <Image
            source={{ uri: image.uri }}
            style={styles.previewImage}
            contentFit="contain"
            transition={300}
          />
        </Card>

        {/* Remove button */}
        <Pressable
          onPress={onRemove}
          style={styles.removeButton}
        >
          <View
            backgroundColor="$red9"
            borderRadius="$10"
            padding="$2"
          >
            <Ionicons name="close" size={20} color="white" />
          </View>
        </Pressable>
      </View>

      <YStack alignItems="center" gap="$1">
        <Text fontSize="$3" fontWeight="500" numberOfLines={1}>
          {image.fileName}
        </Text>
        <Text fontSize="$2" color="$gray10">
          {image.width} x {image.height}px
          {image.fileSize ? ` - ${(image.fileSize / 1024 / 1024).toFixed(1)} MB` : ""}
        </Text>
      </YStack>
    </YStack>
  );
}

// ============================================================================
// Main Upload Screen Component
// ============================================================================

export default function UploadScreen() {
  const insets = useSafeAreaInsets();
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);

  const { setCurrentImage } = useEnhancementStore();
  const {
    isLoading,
    error,
    pickFromCamera,
    pickFromGallery,
    clearSelection,
  } = useImagePicker();

  const handlePickFromCamera = useCallback(async () => {
    const result = await pickFromCamera();
    if (result) {
      setSelectedImage(result);
    }
  }, [pickFromCamera]);

  const handlePickFromGallery = useCallback(async () => {
    const result = await pickFromGallery();
    if (result && result.length > 0) {
      setSelectedImage(result[0]);
    }
  }, [pickFromGallery]);

  const handleRemoveImage = useCallback(() => {
    setSelectedImage(null);
    clearSelection();
  }, [clearSelection]);

  const handleContinue = useCallback(() => {
    if (!selectedImage) {
      Alert.alert("No Image Selected", "Please select an image to enhance.");
      return;
    }

    // Store the selected image URI for the tier selection screen
    setCurrentImage(selectedImage.uri);

    // Navigate to tier selection with the image URI
    router.push({
      pathname: "/enhance/select-tier",
      params: {
        imageUri: selectedImage.uri,
        fileName: selectedImage.fileName,
        width: selectedImage.width.toString(),
        height: selectedImage.height.toString(),
      },
    });
  }, [selectedImage, setCurrentImage]);

  const handleGoBack = useCallback(() => {
    router.back();
  }, []);

  return (
    <View flex={1} backgroundColor="$background">
      {/* Header */}
      <XStack
        paddingTop={insets.top + 8}
        paddingBottom="$3"
        paddingHorizontal="$4"
        alignItems="center"
        justifyContent="space-between"
        backgroundColor="$background"
      >
        <Button
          size="$3"
          chromeless
          icon={<Ionicons name="arrow-back" size={24} color="#666" />}
          onPress={handleGoBack}
        />
        <H3>Select Image</H3>
        <View width={40} />
      </XStack>

      <ScrollView flex={1} contentContainerStyle={styles.scrollContent}>
        {/* Error message */}
        {error && (
          <Card
            backgroundColor="$red2"
            borderColor="$red6"
            bordered
            marginHorizontal="$4"
            marginBottom="$4"
            padding="$3"
          >
            <XStack alignItems="center" gap="$2">
              <Ionicons name="alert-circle" size={20} color="#EF4444" />
              <Text color="$red11" flex={1}>
                {error}
              </Text>
            </XStack>
          </Card>
        )}

        {/* Loading state */}
        {isLoading && (
          <YStack alignItems="center" padding="$6" gap="$3">
            <Spinner size="large" color="$blue10" />
            <Text color="$gray10">Loading image...</Text>
          </YStack>
        )}

        {/* Image preview or source selection */}
        {!isLoading && (
          <>
            {selectedImage
              ? (
                <YStack paddingHorizontal="$4" gap="$4">
                  <ImagePreview
                    image={selectedImage}
                    onRemove={handleRemoveImage}
                  />

                  {/* Continue button */}
                  <Button
                    size="$5"
                    theme="blue"
                    onPress={handleContinue}
                    icon={<Ionicons name="arrow-forward" size={20} color="white" />}
                    iconAfter
                  >
                    Continue to Enhancement
                  </Button>

                  {/* Change image option */}
                  <Button
                    size="$4"
                    variant="outlined"
                    onPress={handleRemoveImage}
                  >
                    Choose Different Image
                  </Button>
                </YStack>
              )
              : (
                <YStack paddingHorizontal="$4" gap="$4">
                  {/* Instructions */}
                  <YStack alignItems="center" gap="$2" marginBottom="$2">
                    <View
                      backgroundColor="$gray4"
                      borderRadius="$10"
                      padding="$4"
                    >
                      <Ionicons name="image-outline" size={48} color="#6B7280" />
                    </View>
                    <Paragraph textAlign="center" color="$gray11">
                      Select an image from your camera or photo library to enhance
                    </Paragraph>
                  </YStack>

                  {/* Source selection buttons */}
                  <XStack gap="$3">
                    <SourceButton
                      icon="camera"
                      title="Camera"
                      subtitle="Take a photo"
                      onPress={handlePickFromCamera}
                      disabled={isLoading}
                    />
                    <SourceButton
                      icon="images"
                      title="Gallery"
                      subtitle="Choose existing"
                      onPress={handlePickFromGallery}
                      disabled={isLoading}
                    />
                  </XStack>

                  {/* Supported formats info */}
                  <Card backgroundColor="$gray2" padding="$3" marginTop="$2">
                    <XStack alignItems="center" gap="$2">
                      <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
                      <Text fontSize="$2" color="$gray10">
                        Supports JPEG, PNG, and WebP up to 50MB
                      </Text>
                    </XStack>
                  </Card>
                </YStack>
              )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  previewImage: {
    width: IMAGE_PREVIEW_SIZE,
    height: IMAGE_PREVIEW_SIZE,
  },
  removeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
  },
});
