/**
 * useImageShare Hook
 * Handles image sharing, downloading to device, and link copying
 */

import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { useCallback, useState } from "react";
import { Alert, Platform } from "react-native";
import { getDownloadUrl, getShareLink } from "../services/api/images";

// ============================================================================
// Types
// ============================================================================

export interface UseImageShareOptions {
  /** Callback when download completes */
  onDownloadComplete?: (uri: string) => void;
  /** Callback when share completes */
  onShareComplete?: () => void;
  /** Callback when link is copied */
  onLinkCopied?: (url: string) => void;
  /** Callback on any error */
  onError?: (error: string) => void;
}

export interface UseImageShareReturn {
  /** Share image via native share sheet */
  shareImage: (imageId: string) => Promise<boolean>;
  /** Download image to device gallery */
  downloadImage: (imageId: string) => Promise<boolean>;
  /** Copy shareable link to clipboard */
  copyLink: (imageId: string) => Promise<boolean>;
  /** Request media library permissions */
  requestPermissions: () => Promise<boolean>;
  /** Whether any operation is in progress */
  isLoading: boolean;
  /** Current operation being performed */
  currentOperation: "share" | "download" | "copy" | null;
  /** Download progress (0-100) */
  downloadProgress: number;
  /** Last error message */
  error: string | null;
  /** Whether sharing is available on this device */
  isSharingAvailable: boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useImageShare(
  options: UseImageShareOptions = {},
): UseImageShareReturn {
  const { onDownloadComplete, onShareComplete, onLinkCopied, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<
    "share" | "download" | "copy" | null
  >(
    null,
  );
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSharingAvailable, setIsSharingAvailable] = useState(true);

  // Check if sharing is available
  const checkSharingAvailable = useCallback(async () => {
    const available = await Sharing.isAvailableAsync();
    setIsSharingAvailable(available);
    return available;
  }, []);

  /**
   * Request media library permissions for saving to device
   */
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();

      if (status !== "granted") {
        const errorMsg = "Permission to access media library was denied";
        setError(errorMsg);
        onError?.(errorMsg);

        Alert.alert(
          "Permission Required",
          "To save images to your device, please grant access to your photo library in Settings.",
          [{ text: "OK" }],
        );
        return false;
      }

      return true;
    } catch (err) {
      const errorMsg = err instanceof Error
        ? err.message
        : "Failed to request permissions";
      setError(errorMsg);
      onError?.(errorMsg);
      return false;
    }
  }, [onError]);

  /**
   * Download image to device gallery
   */
  const downloadImage = useCallback(
    async (imageId: string): Promise<boolean> => {
      setIsLoading(true);
      setCurrentOperation("download");
      setDownloadProgress(0);
      setError(null);

      try {
        // Request permissions first
        const hasPermission = await requestPermissions();
        if (!hasPermission) {
          setIsLoading(false);
          setCurrentOperation(null);
          return false;
        }

        // Get download URL from API
        const response = await getDownloadUrl(imageId);

        if (response.error || !response.data) {
          const errorMsg = response.error || "Failed to get download URL";
          setError(errorMsg);
          onError?.(errorMsg);
          setIsLoading(false);
          setCurrentOperation(null);
          return false;
        }

        const { downloadUrl, fileName, mimeType } = response.data;

        // Determine file extension from mime type
        const extension = mimeType.split("/")[1] || "jpg";
        const localFileName = fileName || `spike-image-${imageId}.${extension}`;
        const fileUri = `${FileSystem.cacheDirectory}${localFileName}`;

        // Download the file with progress tracking
        const downloadResumable = FileSystem.createDownloadResumable(
          downloadUrl,
          fileUri,
          {},
          (progress) => {
            const percent = Math.round(
              (progress.totalBytesWritten /
                progress.totalBytesExpectedToWrite) * 100,
            );
            setDownloadProgress(percent);
          },
        );

        const downloadResult = await downloadResumable.downloadAsync();

        if (!downloadResult || !downloadResult.uri) {
          const errorMsg = "Download failed";
          setError(errorMsg);
          onError?.(errorMsg);
          setIsLoading(false);
          setCurrentOperation(null);
          return false;
        }

        // Save to media library
        const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);

        // Optionally create album for the app
        const albumName = "Spike Land";
        let album = await MediaLibrary.getAlbumAsync(albumName);

        if (!album) {
          album = await MediaLibrary.createAlbumAsync(albumName, asset, false);
        } else {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        }

        // Clean up cache file
        await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true });

        setDownloadProgress(100);
        onDownloadComplete?.(asset.uri);
        setIsLoading(false);
        setCurrentOperation(null);

        return true;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Download failed";
        setError(errorMsg);
        onError?.(errorMsg);
        setIsLoading(false);
        setCurrentOperation(null);
        return false;
      }
    },
    [requestPermissions, onDownloadComplete, onError],
  );

  /**
   * Share image via native share sheet
   */
  const shareImage = useCallback(
    async (imageId: string): Promise<boolean> => {
      setIsLoading(true);
      setCurrentOperation("share");
      setError(null);

      try {
        // Check if sharing is available
        const available = await checkSharingAvailable();
        if (!available) {
          const errorMsg = "Sharing is not available on this device";
          setError(errorMsg);
          onError?.(errorMsg);
          setIsLoading(false);
          setCurrentOperation(null);
          return false;
        }

        // Get download URL from API
        const response = await getDownloadUrl(imageId);

        if (response.error || !response.data) {
          const errorMsg = response.error || "Failed to get image for sharing";
          setError(errorMsg);
          onError?.(errorMsg);
          setIsLoading(false);
          setCurrentOperation(null);
          return false;
        }

        const { downloadUrl, fileName, mimeType } = response.data;

        // Determine file extension from mime type
        const extension = mimeType.split("/")[1] || "jpg";
        const localFileName = fileName || `spike-image-${imageId}.${extension}`;
        const fileUri = `${FileSystem.cacheDirectory}${localFileName}`;

        // Download the file to cache for sharing
        const downloadResult = await FileSystem.downloadAsync(
          downloadUrl,
          fileUri,
        );

        if (!downloadResult || downloadResult.status !== 200) {
          const errorMsg = "Failed to download image for sharing";
          setError(errorMsg);
          onError?.(errorMsg);
          setIsLoading(false);
          setCurrentOperation(null);
          return false;
        }

        // Share the file
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType,
          dialogTitle: "Share Image",
          UTI: Platform.OS === "ios" ? `public.${extension}` : undefined,
        });

        // Clean up cache file after sharing
        await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true });

        onShareComplete?.();
        setIsLoading(false);
        setCurrentOperation(null);

        return true;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Share failed";
        setError(errorMsg);
        onError?.(errorMsg);
        setIsLoading(false);
        setCurrentOperation(null);
        return false;
      }
    },
    [checkSharingAvailable, onShareComplete, onError],
  );

  /**
   * Copy shareable link to clipboard
   */
  const copyLink = useCallback(
    async (imageId: string): Promise<boolean> => {
      setIsLoading(true);
      setCurrentOperation("copy");
      setError(null);

      try {
        // Get share link from API
        const response = await getShareLink(imageId);

        if (response.error || !response.data) {
          const errorMsg = response.error || "Failed to get share link";
          setError(errorMsg);
          onError?.(errorMsg);
          setIsLoading(false);
          setCurrentOperation(null);
          return false;
        }

        const { shareUrl } = response.data;

        // Copy to clipboard
        await Clipboard.setStringAsync(shareUrl);

        onLinkCopied?.(shareUrl);
        setIsLoading(false);
        setCurrentOperation(null);

        return true;
      } catch (err) {
        const errorMsg = err instanceof Error
          ? err.message
          : "Failed to copy link";
        setError(errorMsg);
        onError?.(errorMsg);
        setIsLoading(false);
        setCurrentOperation(null);
        return false;
      }
    },
    [onLinkCopied, onError],
  );

  return {
    shareImage,
    downloadImage,
    copyLink,
    requestPermissions,
    isLoading,
    currentOperation,
    downloadProgress,
    error,
    isSharingAvailable,
  };
}
