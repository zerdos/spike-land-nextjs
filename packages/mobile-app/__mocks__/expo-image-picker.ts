/**
 * Mock for expo-image-picker
 * Provides controllable image picker behavior for testing
 */

// Types - Must be defined before use
export enum MediaTypeOptions {
  All = "All",
  Images = "Images",
  Videos = "Videos",
}

export enum PermissionStatus {
  UNDETERMINED = "undetermined",
  GRANTED = "granted",
  DENIED = "denied",
}

export interface PermissionResponse {
  granted: boolean;
  canAskAgain: boolean;
  expires: "never" | number;
  status: PermissionStatus;
}

export interface ImagePickerAsset {
  uri: string;
  width: number;
  height: number;
  type?: "image" | "video";
  fileName?: string | null;
  fileSize?: number;
  mimeType?: string;
  base64?: string;
  exif?: Record<string, unknown>;
  assetId?: string | null;
}

export interface ImagePickerCanceledResult {
  canceled: true;
  assets: null;
}

export interface ImagePickerSuccessResult {
  canceled: false;
  assets: ImagePickerAsset[];
}

export type ImagePickerResult = ImagePickerCanceledResult | ImagePickerSuccessResult;

export interface ImagePickerOptions {
  mediaTypes?: MediaTypeOptions;
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  base64?: boolean;
  exif?: boolean;
  allowsMultipleSelection?: boolean;
  selectionLimit?: number;
  videoMaxDuration?: number;
  presentationStyle?: "fullScreen" | "pageSheet" | "formSheet" | "overFullScreen";
}

export interface CameraPermissionResponse extends PermissionResponse {}
export interface MediaLibraryPermissionResponse extends PermissionResponse {}

// Default mock image result
const defaultImageResult: ImagePickerSuccessResult = {
  canceled: false,
  assets: [
    {
      uri: "file:///test/image.jpg",
      width: 1024,
      height: 768,
      type: "image" as const,
      fileName: "test-image.jpg",
      fileSize: 123456,
      mimeType: "image/jpeg",
      base64: undefined,
      exif: undefined,
      assetId: undefined,
    },
  ],
};

// Mock state for controlling test behavior
let mockResult: ImagePickerResult = defaultImageResult;
let mockPermissions: PermissionResponse = {
  granted: true,
  canAskAgain: true,
  expires: "never",
  status: PermissionStatus.GRANTED,
};

/**
 * Request camera permissions
 */
export async function requestCameraPermissionsAsync(): Promise<CameraPermissionResponse> {
  return mockPermissions;
}

/**
 * Request media library permissions
 */
export async function requestMediaLibraryPermissionsAsync(): Promise<
  MediaLibraryPermissionResponse
> {
  return mockPermissions;
}

/**
 * Get camera permissions
 */
export async function getCameraPermissionsAsync(): Promise<CameraPermissionResponse> {
  return mockPermissions;
}

/**
 * Get media library permissions
 */
export async function getMediaLibraryPermissionsAsync(): Promise<MediaLibraryPermissionResponse> {
  return mockPermissions;
}

/**
 * Launch image library picker
 */
export async function launchImageLibraryAsync(
  _options?: ImagePickerOptions,
): Promise<ImagePickerResult> {
  return mockResult;
}

/**
 * Launch camera
 */
export async function launchCameraAsync(
  _options?: ImagePickerOptions,
): Promise<ImagePickerResult> {
  return mockResult;
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Set mock result for image picker (test utility)
 */
export function __setMockResult(result: ImagePickerResult): void {
  mockResult = result;
}

/**
 * Set mock permissions (test utility)
 */
export function __setMockPermissions(permissions: Partial<PermissionResponse>): void {
  mockPermissions = {
    ...mockPermissions,
    ...permissions,
  };
}

/**
 * Reset mocks to defaults (test utility)
 */
export function __resetMocks(): void {
  mockResult = defaultImageResult;
  mockPermissions = {
    granted: true,
    canAskAgain: true,
    expires: "never",
    status: PermissionStatus.GRANTED,
  };
}

/**
 * Create a canceled result (test utility)
 */
export function __createCanceledResult(): ImagePickerCanceledResult {
  return {
    canceled: true,
    assets: null,
  };
}

/**
 * Create a success result with custom assets (test utility)
 */
export function __createSuccessResult(
  assets: Partial<ImagePickerAsset>[],
): ImagePickerSuccessResult {
  return {
    canceled: false,
    assets: assets.map((asset) => ({
      uri: asset.uri || "file:///test/image.jpg",
      width: asset.width || 1024,
      height: asset.height || 768,
      type: asset.type || "image",
      fileName: asset.fileName || "test-image.jpg",
      fileSize: asset.fileSize || 123456,
      mimeType: asset.mimeType || "image/jpeg",
      base64: asset.base64,
      exif: asset.exif,
      assetId: asset.assetId,
    })),
  };
}

export default {
  MediaTypeOptions,
  PermissionStatus,
  requestCameraPermissionsAsync,
  requestMediaLibraryPermissionsAsync,
  getCameraPermissionsAsync,
  getMediaLibraryPermissionsAsync,
  launchImageLibraryAsync,
  launchCameraAsync,
  __setMockResult,
  __setMockPermissions,
  __resetMocks,
  __createCanceledResult,
  __createSuccessResult,
};
