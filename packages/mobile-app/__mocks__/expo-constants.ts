/**
 * Mock for expo-constants
 * Provides app configuration and environment constants for testing
 */

export interface ExpoConfig {
  name: string;
  slug: string;
  version: string;
  orientation?: string;
  icon?: string;
  userInterfaceStyle?: string;
  splash?: {
    image?: string;
    resizeMode?: string;
    backgroundColor?: string;
  };
  ios?: {
    supportsTablet?: boolean;
    bundleIdentifier?: string;
  };
  android?: {
    adaptiveIcon?: {
      foregroundImage?: string;
      backgroundColor?: string;
    };
    package?: string;
  };
  web?: {
    favicon?: string;
  };
  extra?: Record<string, unknown>;
  scheme?: string;
}

export interface Constants {
  expoConfig: ExpoConfig | null;
  executionEnvironment: "storeClient" | "standalone" | "bare";
  appOwnership: "expo" | "standalone" | "guest" | null;
  deviceName: string | null;
  deviceYearClass: number | null;
  isDevice: boolean;
  platform: {
    ios?: {
      buildNumber: string;
      platform: string;
      model: string;
      systemVersion: string;
    };
    android?: {
      versionCode: number;
    };
  };
  sessionId: string;
  statusBarHeight: number;
  systemFonts: string[];
  manifest: unknown;
  manifest2: unknown;
}

// Default mock configuration
const defaultConfig: ExpoConfig = {
  name: "spike-land",
  slug: "spike-land",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "spikeland",
  extra: {
    apiUrl: "https://spike.land",
    eas: {
      projectId: "test-project-id",
    },
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "land.spike.app",
  },
  android: {
    package: "land.spike.app",
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
  },
};

// Mock constants object
let mockConstants: Constants = {
  expoConfig: defaultConfig,
  executionEnvironment: "storeClient",
  appOwnership: "expo",
  deviceName: "Test Device",
  deviceYearClass: 2023,
  isDevice: true,
  platform: {
    ios: {
      buildNumber: "1",
      platform: "iPhone",
      model: "iPhone 15 Pro",
      systemVersion: "17.0",
    },
  },
  sessionId: "test-session-id",
  statusBarHeight: 44,
  systemFonts: ["System"],
  manifest: null,
  manifest2: null,
};

// Export as default for compatibility
export default mockConstants;

// Named exports for specific constants
export const expoConfig = mockConstants.expoConfig;
export const executionEnvironment = mockConstants.executionEnvironment;
export const appOwnership = mockConstants.appOwnership;
export const deviceName = mockConstants.deviceName;
export const isDevice = mockConstants.isDevice;
export const platform = mockConstants.platform;
export const sessionId = mockConstants.sessionId;
export const statusBarHeight = mockConstants.statusBarHeight;
export const systemFonts = mockConstants.systemFonts;

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Set mock configuration (test utility)
 */
export function __setMockConfig(config: Partial<ExpoConfig>): void {
  mockConstants = {
    ...mockConstants,
    expoConfig: {
      ...defaultConfig,
      ...config,
    },
  };
}

/**
 * Set mock constants (test utility)
 */
export function __setMockConstants(constants: Partial<Constants>): void {
  mockConstants = {
    ...mockConstants,
    ...constants,
  };
}

/**
 * Reset mocks to defaults (test utility)
 */
export function __resetMocks(): void {
  mockConstants = {
    expoConfig: { ...defaultConfig },
    executionEnvironment: "storeClient",
    appOwnership: "expo",
    deviceName: "Test Device",
    deviceYearClass: 2023,
    isDevice: true,
    platform: {
      ios: {
        buildNumber: "1",
        platform: "iPhone",
        model: "iPhone 15 Pro",
        systemVersion: "17.0",
      },
    },
    sessionId: "test-session-id",
    statusBarHeight: 44,
    systemFonts: ["System"],
    manifest: null,
    manifest2: null,
  };
}

/**
 * Get current mock constants (test utility)
 */
export function __getMockConstants(): Constants {
  return { ...mockConstants };
}
