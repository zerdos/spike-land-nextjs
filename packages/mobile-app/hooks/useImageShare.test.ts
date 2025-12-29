/**
 * useImageShare Hook Tests
 * Tests for image sharing, downloading, and link copying functionality
 */

import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";

import { getDownloadUrl, getShareLink } from "../services/api/images";
import { useImageShare } from "./useImageShare";

// Mock the API functions
jest.mock("../services/api/images", () => ({
  getDownloadUrl: jest.fn(),
  getShareLink: jest.fn(),
}));

const mockGetDownloadUrl = getDownloadUrl as jest.MockedFunction<typeof getDownloadUrl>;
const mockGetShareLink = getShareLink as jest.MockedFunction<typeof getShareLink>;

describe("useImageShare", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks to default values
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
    (MediaLibrary.getAlbumAsync as jest.Mock).mockResolvedValue(null);
    (MediaLibrary.createAssetAsync as jest.Mock).mockResolvedValue({
      id: "test-asset-id",
      uri: "file:///photos/test-image.jpg",
      mediaType: "photo",
      width: 1920,
      height: 1080,
    });
    (MediaLibrary.createAlbumAsync as jest.Mock).mockResolvedValue({
      id: "test-album-id",
      title: "Spike Land",
    });
    // Reset FileSystem mocks to default implementations
    (FileSystem.createDownloadResumable as jest.Mock).mockImplementation(() => ({
      downloadAsync: jest.fn().mockResolvedValue({
        uri: "file:///cache/test-image.jpg",
      }),
      pauseAsync: jest.fn(),
      resumeAsync: jest.fn(),
    }));
    (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({
      uri: "file:///cache/test-image.jpg",
      status: 200,
      headers: {},
    });
    (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
  });

  // ==========================================================================
  // Initial State Tests
  // ==========================================================================

  describe("initial state", () => {
    it("should return correct initial state", () => {
      const { result } = renderHook(() => useImageShare());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.currentOperation).toBeNull();
      expect(result.current.downloadProgress).toBe(0);
      expect(result.current.error).toBeNull();
      expect(result.current.isSharingAvailable).toBe(true);
      expect(typeof result.current.shareImage).toBe("function");
      expect(typeof result.current.downloadImage).toBe("function");
      expect(typeof result.current.copyLink).toBe("function");
      expect(typeof result.current.requestPermissions).toBe("function");
    });
  });

  // ==========================================================================
  // Permissions Tests
  // ==========================================================================

  describe("requestPermissions", () => {
    it("should request permissions successfully", async () => {
      const { result } = renderHook(() => useImageShare());

      let permissionResult: boolean;
      await act(async () => {
        permissionResult = await result.current.requestPermissions();
      });

      expect(permissionResult!).toBe(true);
      expect(MediaLibrary.requestPermissionsAsync).toHaveBeenCalled();
    });

    it("should handle permission denied", async () => {
      const mockRequestPermissions = MediaLibrary.requestPermissionsAsync as jest.Mock;
      mockRequestPermissions.mockResolvedValueOnce({ status: "denied" });

      const alertSpy = jest.spyOn(Alert, "alert");
      const onError = jest.fn();
      const { result } = renderHook(() => useImageShare({ onError }));

      let permissionResult: boolean;
      await act(async () => {
        permissionResult = await result.current.requestPermissions();
      });

      expect(permissionResult!).toBe(false);
      expect(onError).toHaveBeenCalledWith("Permission to access media library was denied");
      expect(alertSpy).toHaveBeenCalledWith(
        "Permission Required",
        expect.any(String),
        expect.any(Array),
      );
    });

    it("should handle permission request error", async () => {
      const mockRequestPermissions = MediaLibrary.requestPermissionsAsync as jest.Mock;
      mockRequestPermissions.mockRejectedValueOnce(new Error("Permission error"));

      const onError = jest.fn();
      const { result } = renderHook(() => useImageShare({ onError }));

      let permissionResult: boolean;
      await act(async () => {
        permissionResult = await result.current.requestPermissions();
      });

      expect(permissionResult!).toBe(false);
      expect(onError).toHaveBeenCalledWith("Permission error");
    });
  });

  // ==========================================================================
  // Download Image Tests
  // ==========================================================================

  describe("downloadImage", () => {
    it("should download image successfully", async () => {
      mockGetDownloadUrl.mockResolvedValue({
        data: {
          downloadUrl: "https://example.com/image.jpg",
          expiresAt: "2024-12-31T23:59:59Z",
          fileName: "test-image.jpg",
          mimeType: "image/jpeg",
          fileSize: 1024000,
        },
        error: null,
        status: 200,
      });

      const onDownloadComplete = jest.fn();
      const { result } = renderHook(() => useImageShare({ onDownloadComplete }));

      let downloadResult: boolean;
      await act(async () => {
        downloadResult = await result.current.downloadImage("img-123");
      });

      expect(downloadResult!).toBe(true);
      expect(mockGetDownloadUrl).toHaveBeenCalledWith("img-123");
      expect(MediaLibrary.createAssetAsync).toHaveBeenCalled();
      expect(onDownloadComplete).toHaveBeenCalled();
    });

    it("should handle API error during download", async () => {
      mockGetDownloadUrl.mockResolvedValue({
        data: null,
        error: "Image not found",
        status: 404,
      });

      const onError = jest.fn();
      const { result } = renderHook(() => useImageShare({ onError }));

      let downloadResult: boolean;
      await act(async () => {
        downloadResult = await result.current.downloadImage("img-123");
      });

      expect(downloadResult!).toBe(false);
      expect(onError).toHaveBeenCalledWith("Image not found");
      expect(result.current.error).toBe("Image not found");
    });

    it("should handle permission denied during download", async () => {
      const mockRequestPermissions = MediaLibrary.requestPermissionsAsync as jest.Mock;
      mockRequestPermissions.mockResolvedValueOnce({ status: "denied" });

      const { result } = renderHook(() => useImageShare());

      let downloadResult: boolean;
      await act(async () => {
        downloadResult = await result.current.downloadImage("img-123");
      });

      expect(downloadResult!).toBe(false);
      expect(mockGetDownloadUrl).not.toHaveBeenCalled();
    });

    it("should handle download failure", async () => {
      mockGetDownloadUrl.mockResolvedValue({
        data: {
          downloadUrl: "https://example.com/image.jpg",
          expiresAt: "2024-12-31T23:59:59Z",
          fileName: "test-image.jpg",
          mimeType: "image/jpeg",
          fileSize: 1024000,
        },
        error: null,
        status: 200,
      });

      const mockDownloadResumable = FileSystem.createDownloadResumable as jest.Mock;
      mockDownloadResumable.mockReturnValue({
        downloadAsync: jest.fn().mockResolvedValue(null),
      });

      const onError = jest.fn();
      const { result } = renderHook(() => useImageShare({ onError }));

      let downloadResult: boolean;
      await act(async () => {
        downloadResult = await result.current.downloadImage("img-123");
      });

      expect(downloadResult!).toBe(false);
      expect(onError).toHaveBeenCalledWith("Download failed");
    });

    it("should add to existing album if it exists", async () => {
      mockGetDownloadUrl.mockResolvedValue({
        data: {
          downloadUrl: "https://example.com/image.jpg",
          expiresAt: "2024-12-31T23:59:59Z",
          fileName: "test-image.jpg",
          mimeType: "image/jpeg",
          fileSize: 1024000,
        },
        error: null,
        status: 200,
      });

      const mockGetAlbum = MediaLibrary.getAlbumAsync as jest.Mock;
      mockGetAlbum.mockResolvedValueOnce({ id: "existing-album", title: "Spike Land" });

      const { result } = renderHook(() => useImageShare());

      await act(async () => {
        await result.current.downloadImage("img-123");
      });

      expect(MediaLibrary.addAssetsToAlbumAsync).toHaveBeenCalled();
      expect(MediaLibrary.createAlbumAsync).not.toHaveBeenCalled();
    });

    it("should set loading state during download", async () => {
      // Use a promise that we control to verify loading state
      let resolveDownload: (value: { uri: string; }) => void;
      const downloadPromise = new Promise<{ uri: string; }>((resolve) => {
        resolveDownload = resolve;
      });

      mockGetDownloadUrl.mockResolvedValue({
        data: {
          downloadUrl: "https://example.com/image.jpg",
          expiresAt: "2024-12-31T23:59:59Z",
          fileName: "test-image.jpg",
          mimeType: "image/jpeg",
          fileSize: 1024000,
        },
        error: null,
        status: 200,
      });

      const mockDownloadResumable = FileSystem.createDownloadResumable as jest.Mock;
      mockDownloadResumable.mockReturnValue({
        downloadAsync: jest.fn().mockReturnValue(downloadPromise),
      });

      const { result } = renderHook(() => useImageShare());

      // Start download within act
      let downloadResultPromise: Promise<boolean>;
      await act(async () => {
        downloadResultPromise = result.current.downloadImage("img-123");
        // Wait for initial state updates
        await Promise.resolve();
      });

      // Check loading state is set
      expect(result.current.isLoading).toBe(true);
      expect(result.current.currentOperation).toBe("download");

      // Complete the download
      await act(async () => {
        resolveDownload!({ uri: "file:///cache/test-image.jpg" });
        await downloadResultPromise!;
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.currentOperation).toBeNull();
    });

    it("should handle exception during download", async () => {
      mockGetDownloadUrl.mockRejectedValue(new Error("Network error"));

      const onError = jest.fn();
      const { result } = renderHook(() => useImageShare({ onError }));

      let downloadResult: boolean;
      await act(async () => {
        downloadResult = await result.current.downloadImage("img-123");
      });

      expect(downloadResult!).toBe(false);
      expect(onError).toHaveBeenCalledWith("Network error");
    });

    it("should use default extension when mime type has no extension", async () => {
      mockGetDownloadUrl.mockResolvedValue({
        data: {
          downloadUrl: "https://example.com/image.jpg",
          expiresAt: "2024-12-31T23:59:59Z",
          fileName: "",
          mimeType: "image/",
          fileSize: 1024000,
        },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useImageShare());

      await act(async () => {
        await result.current.downloadImage("img-123");
      });

      // When mimeType is "image/" the extension becomes empty, so fallback to "jpg"
      // The file would be named "spike-image-img-123.jpg"
      expect(FileSystem.createDownloadResumable).toHaveBeenCalledWith(
        "https://example.com/image.jpg",
        expect.stringMatching(/spike-image-img-123/),
        expect.any(Object),
        expect.any(Function),
      );
    });
  });

  // ==========================================================================
  // Share Image Tests
  // ==========================================================================

  describe("shareImage", () => {
    it("should share image successfully", async () => {
      mockGetDownloadUrl.mockResolvedValue({
        data: {
          downloadUrl: "https://example.com/image.jpg",
          expiresAt: "2024-12-31T23:59:59Z",
          fileName: "test-image.jpg",
          mimeType: "image/jpeg",
          fileSize: 1024000,
        },
        error: null,
        status: 200,
      });

      const onShareComplete = jest.fn();
      const { result } = renderHook(() => useImageShare({ onShareComplete }));

      let shareResult: boolean;
      await act(async () => {
        shareResult = await result.current.shareImage("img-123");
      });

      expect(shareResult!).toBe(true);
      expect(Sharing.shareAsync).toHaveBeenCalled();
      expect(onShareComplete).toHaveBeenCalled();
    });

    it("should handle sharing not available", async () => {
      const mockIsAvailable = Sharing.isAvailableAsync as jest.Mock;
      mockIsAvailable.mockResolvedValueOnce(false);

      const onError = jest.fn();
      const { result } = renderHook(() => useImageShare({ onError }));

      let shareResult: boolean;
      await act(async () => {
        shareResult = await result.current.shareImage("img-123");
      });

      expect(shareResult!).toBe(false);
      expect(onError).toHaveBeenCalledWith("Sharing is not available on this device");
    });

    it("should handle API error during share", async () => {
      mockGetDownloadUrl.mockResolvedValue({
        data: null,
        error: "Failed to get download URL",
        status: 500,
      });

      const onError = jest.fn();
      const { result } = renderHook(() => useImageShare({ onError }));

      let shareResult: boolean;
      await act(async () => {
        shareResult = await result.current.shareImage("img-123");
      });

      expect(shareResult!).toBe(false);
      expect(onError).toHaveBeenCalledWith("Failed to get download URL");
    });

    it("should handle download failure during share", async () => {
      mockGetDownloadUrl.mockResolvedValue({
        data: {
          downloadUrl: "https://example.com/image.jpg",
          expiresAt: "2024-12-31T23:59:59Z",
          fileName: "test-image.jpg",
          mimeType: "image/jpeg",
          fileSize: 1024000,
        },
        error: null,
        status: 200,
      });

      const mockDownload = FileSystem.downloadAsync as jest.Mock;
      mockDownload.mockResolvedValueOnce({ status: 500, uri: null });

      const onError = jest.fn();
      const { result } = renderHook(() => useImageShare({ onError }));

      let shareResult: boolean;
      await act(async () => {
        shareResult = await result.current.shareImage("img-123");
      });

      expect(shareResult!).toBe(false);
      expect(onError).toHaveBeenCalledWith("Failed to download image for sharing");
    });

    it("should handle exception during share", async () => {
      mockGetDownloadUrl.mockRejectedValue(new Error("Network error"));

      const onError = jest.fn();
      const { result } = renderHook(() => useImageShare({ onError }));

      let shareResult: boolean;
      await act(async () => {
        shareResult = await result.current.shareImage("img-123");
      });

      expect(shareResult!).toBe(false);
      expect(onError).toHaveBeenCalledWith("Network error");
    });

    it("should clean up cache file after sharing", async () => {
      mockGetDownloadUrl.mockResolvedValue({
        data: {
          downloadUrl: "https://example.com/image.jpg",
          expiresAt: "2024-12-31T23:59:59Z",
          fileName: "test-image.jpg",
          mimeType: "image/jpeg",
          fileSize: 1024000,
        },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useImageShare());

      await act(async () => {
        await result.current.shareImage("img-123");
      });

      expect(FileSystem.deleteAsync).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Copy Link Tests
  // ==========================================================================

  describe("copyLink", () => {
    it("should copy link successfully", async () => {
      mockGetShareLink.mockResolvedValue({
        data: {
          shareUrl: "https://spike.land/s/abc123",
          shareToken: "abc123",
          expiresAt: null,
        },
        error: null,
        status: 200,
      });

      const onLinkCopied = jest.fn();
      const { result } = renderHook(() => useImageShare({ onLinkCopied }));

      let copyResult: boolean;
      await act(async () => {
        copyResult = await result.current.copyLink("img-123");
      });

      expect(copyResult!).toBe(true);
      expect(mockGetShareLink).toHaveBeenCalledWith("img-123");
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith("https://spike.land/s/abc123");
      expect(onLinkCopied).toHaveBeenCalledWith("https://spike.land/s/abc123");
    });

    it("should handle API error during copy", async () => {
      mockGetShareLink.mockResolvedValue({
        data: null,
        error: "Failed to get share link",
        status: 500,
      });

      const onError = jest.fn();
      const { result } = renderHook(() => useImageShare({ onError }));

      let copyResult: boolean;
      await act(async () => {
        copyResult = await result.current.copyLink("img-123");
      });

      expect(copyResult!).toBe(false);
      expect(onError).toHaveBeenCalledWith("Failed to get share link");
    });

    it("should handle exception during copy", async () => {
      mockGetShareLink.mockRejectedValue(new Error("Network error"));

      const onError = jest.fn();
      const { result } = renderHook(() => useImageShare({ onError }));

      let copyResult: boolean;
      await act(async () => {
        copyResult = await result.current.copyLink("img-123");
      });

      expect(copyResult!).toBe(false);
      expect(onError).toHaveBeenCalledWith("Network error");
    });

    it("should set loading state during copy", async () => {
      // Use a promise that we control to verify loading state
      let resolveShareLink: (value: {
        data: { shareUrl: string; shareToken: string; expiresAt: null; };
        error: null;
        status: number;
      }) => void;
      const shareLinkPromise = new Promise<{
        data: { shareUrl: string; shareToken: string; expiresAt: null; };
        error: null;
        status: number;
      }>((resolve) => {
        resolveShareLink = resolve;
      });

      mockGetShareLink.mockReturnValue(shareLinkPromise);

      const { result } = renderHook(() => useImageShare());

      // Start copy within act
      let copyResultPromise: Promise<boolean>;
      await act(async () => {
        copyResultPromise = result.current.copyLink("img-123");
        // Wait for initial state updates
        await Promise.resolve();
      });

      // Check loading state is set
      expect(result.current.isLoading).toBe(true);
      expect(result.current.currentOperation).toBe("copy");

      // Complete the operation
      await act(async () => {
        resolveShareLink!({
          data: {
            shareUrl: "https://spike.land/s/abc123",
            shareToken: "abc123",
            expiresAt: null,
          },
          error: null,
          status: 200,
        });
        await copyResultPromise!;
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.currentOperation).toBeNull();
    });

    it("should handle non-Error exception", async () => {
      mockGetShareLink.mockRejectedValue("String error");

      const onError = jest.fn();
      const { result } = renderHook(() => useImageShare({ onError }));

      await act(async () => {
        await result.current.copyLink("img-123");
      });

      expect(onError).toHaveBeenCalledWith("Failed to copy link");
    });
  });

  // ==========================================================================
  // Callback Tests
  // ==========================================================================

  describe("callbacks", () => {
    it("should not call callbacks if not provided", async () => {
      mockGetShareLink.mockResolvedValue({
        data: {
          shareUrl: "https://spike.land/s/abc123",
          shareToken: "abc123",
          expiresAt: null,
        },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useImageShare());

      // Should not throw even without callbacks
      await act(async () => {
        await result.current.copyLink("img-123");
      });

      expect(result.current.error).toBeNull();
    });
  });
});
