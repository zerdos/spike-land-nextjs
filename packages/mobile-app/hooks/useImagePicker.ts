/**
 * useImagePicker Hook
 * Handles camera and gallery image selection with proper permissions
 */

import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";
import { Alert, Linking, Platform } from "react-native";

// ============================================================================
// Types
// ============================================================================

export interface SelectedImage {
  uri: string;
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  fileSize?: number;
}

export interface UseImagePickerOptions {
  allowsMultipleSelection?: boolean;
  maxSelections?: number;
  quality?: number;
  allowsEditing?: boolean;
}

export interface UseImagePickerReturn {
  selectedImages: SelectedImage[];
  isLoading: boolean;
  error: string | null;
  pickFromGallery: () => Promise<SelectedImage[] | null>;
  pickFromCamera: () => Promise<SelectedImage | null>;
  clearSelection: () => void;
  removeImage: (uri: string) => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_OPTIONS: UseImagePickerOptions = {
  allowsMultipleSelection: false,
  maxSelections: 20,
  quality: 0.9,
  allowsEditing: false,
};

// ============================================================================
// Hook Implementation
// ============================================================================

export function useImagePicker(
  options: UseImagePickerOptions = {},
): UseImagePickerReturn {
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  /**
   * Request camera permissions
   */
  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Camera Permission Required",
        "Please enable camera access in your device settings to take photos.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => {
              if (Platform.OS === "ios") {
                Linking.openURL("app-settings:");
              } else {
                Linking.openSettings();
              }
            },
          },
        ],
      );
      return false;
    }

    return true;
  }, []);

  /**
   * Request media library permissions
   */
  const requestMediaLibraryPermission = useCallback(
    async (): Promise<boolean> => {
      const { status } = await ImagePicker
        .requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Photo Library Permission Required",
          "Please enable photo library access in your device settings to select photos.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => {
                if (Platform.OS === "ios") {
                  Linking.openURL("app-settings:");
                } else {
                  Linking.openSettings();
                }
              },
            },
          ],
        );
        return false;
      }

      return true;
    },
    [],
  );

  /**
   * Convert ImagePicker result to SelectedImage format
   */
  const convertToSelectedImage = useCallback(
    (asset: ImagePicker.ImagePickerAsset): SelectedImage => {
      const fileName = asset.fileName ||
        `image_${Date.now()}.${asset.mimeType?.split("/")[1] || "jpg"}`;

      return {
        uri: asset.uri,
        fileName,
        mimeType: asset.mimeType || "image/jpeg",
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize,
      };
    },
    [],
  );

  /**
   * Pick images from gallery
   */
  const pickFromGallery = useCallback(
    async (): Promise<SelectedImage[] | null> => {
      setError(null);
      setIsLoading(true);

      try {
        const hasPermission = await requestMediaLibraryPermission();
        if (!hasPermission) {
          setIsLoading(false);
          return null;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsMultipleSelection: mergedOptions.allowsMultipleSelection,
          selectionLimit: mergedOptions.maxSelections,
          quality: mergedOptions.quality,
          allowsEditing: mergedOptions.allowsEditing &&
            !mergedOptions.allowsMultipleSelection,
          exif: false,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
          setIsLoading(false);
          return null;
        }

        const images = result.assets.map(convertToSelectedImage);
        setSelectedImages((prev) => [...prev, ...images]);
        setIsLoading(false);

        return images;
      } catch (err) {
        const errorMessage = err instanceof Error
          ? err.message
          : "Failed to pick images";
        setError(errorMessage);
        setIsLoading(false);
        return null;
      }
    },
    [
      requestMediaLibraryPermission,
      convertToSelectedImage,
      mergedOptions.allowsMultipleSelection,
      mergedOptions.maxSelections,
      mergedOptions.quality,
      mergedOptions.allowsEditing,
    ],
  );

  /**
   * Capture image from camera
   */
  const pickFromCamera = useCallback(
    async (): Promise<SelectedImage | null> => {
      setError(null);
      setIsLoading(true);

      try {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) {
          setIsLoading(false);
          return null;
        }

        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: mergedOptions.quality,
          allowsEditing: mergedOptions.allowsEditing,
          exif: false,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
          setIsLoading(false);
          return null;
        }

        const image = convertToSelectedImage(result.assets[0]);
        setSelectedImages((prev) => [...prev, image]);
        setIsLoading(false);

        return image;
      } catch (err) {
        const errorMessage = err instanceof Error
          ? err.message
          : "Failed to capture image";
        setError(errorMessage);
        setIsLoading(false);
        return null;
      }
    },
    [
      requestCameraPermission,
      convertToSelectedImage,
      mergedOptions.quality,
      mergedOptions.allowsEditing,
    ],
  );

  /**
   * Clear all selected images
   */
  const clearSelection = useCallback(() => {
    setSelectedImages([]);
    setError(null);
  }, []);

  /**
   * Remove a specific image by URI
   */
  const removeImage = useCallback((uri: string) => {
    setSelectedImages((prev) => prev.filter((img) => img.uri !== uri));
  }, []);

  return {
    selectedImages,
    isLoading,
    error,
    pickFromGallery,
    pickFromCamera,
    clearSelection,
    removeImage,
  };
}
