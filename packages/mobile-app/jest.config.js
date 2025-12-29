/**
 * Jest Configuration for Expo/React Native Mobile App
 * Configured for 100% code coverage requirement
 */

/** @type {import('jest').Config} */
const config = {
  // Use react-native preset with custom setup
  preset: "react-native",

  // Setup file for mocks and test utilities
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  // Test file patterns
  testMatch: [
    "**/__tests__/**/*.test.[jt]s?(x)",
    "**/*.test.[jt]s?(x)",
    "!**/__tests__/test-utils.tsx",
  ],

  // Transform patterns for Expo and React Native modules
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|tamagui|@tamagui/.*|@tanstack/.*|zustand|@spike-npm-land/.*)",
  ],

  // Module name mapper for @ aliases and mocks
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    // Mock expo winter runtime to prevent import errors
    "^expo/src/winter/(.*)$": "<rootDir>/__mocks__/expo-winter.ts",
    "^expo/src/winter$": "<rootDir>/__mocks__/expo-winter.ts",
    "^expo$": "<rootDir>/__mocks__/expo.ts",
    "^expo-secure-store$": "<rootDir>/__mocks__/expo-secure-store.ts",
    "^expo-image-picker$": "<rootDir>/__mocks__/expo-image-picker.ts",
    "^expo-constants$": "<rootDir>/__mocks__/expo-constants.ts",
    // Tamagui mocks
    "^@tamagui/config$": "<rootDir>/__mocks__/@tamagui/config.ts",
    "^@tamagui/config/v3$": "<rootDir>/__mocks__/@tamagui/config.ts",
    "^@tamagui/animations-css$": "<rootDir>/__mocks__/@tamagui/animations-css.ts",
    "^@tamagui/font-inter$": "<rootDir>/__mocks__/@tamagui/font-inter.ts",
    "^@tamagui/shorthands$": "<rootDir>/__mocks__/@tamagui/shorthands.ts",
    "^@tamagui/lucide-icons$": "<rootDir>/__mocks__/@tamagui/lucide-icons.ts",
    "^tamagui$": "<rootDir>/__mocks__/tamagui.ts",
    // Mock the tamagui.config.ts to prevent import chain issues
    "^\\./tamagui\\.config$": "<rootDir>/__mocks__/@tamagui/config.ts",
    "^\\.\\./tamagui\\.config$": "<rootDir>/__mocks__/@tamagui/config.ts",
    "^\\.\\./\\.\\./tamagui\\.config$": "<rootDir>/__mocks__/@tamagui/config.ts",
    // Root directory mappings for tests in __tests__/app/ directory
    // Maps relative imports from test files to correct source locations
    "^\\.\\./\\.\\./(stores|hooks|components|services|constants)(.*)$": "<rootDir>/$1$2",
    "^\\.\\./\\.\\./\\.\\./(stores|hooks|components|services|constants)(.*)$": "<rootDir>/$1$2",
    "^\\.\\./\\.\\./\\.\\./\\.\\./(stores|hooks|components|services|constants)(.*)$":
      "<rootDir>/$1$2",
    // Shared package mock
    "^@spike-npm-land/shared$": "<rootDir>/__mocks__/@spike-npm-land/shared.ts",
  },

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    "**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/__tests__/**",
    "!**/__mocks__/**",
    "!**/coverage/**",
    "!jest.config.js",
    "!jest.setup.ts",
    "!babel.config.js",
    "!metro.config.js",
    "!tamagui.config.ts",
    "!app.config.ts",
    "!**/app/_layout.tsx",
    "!expo-env.d.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "text-summary", "lcov", "html"],

  // Enforce 100% coverage threshold
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },

  // Module file extensions
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Test timeout
  testTimeout: 10000,

  // Ignore patterns
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/.expo/",
    "<rootDir>/coverage/",
  ],

  // Globals for TypeScript and environment
  globals: {
    __DEV__: true,
  },

  // Environment variables for Expo
  testEnvironmentOptions: {
    customExportConditions: ["node", "node-addons"],
  },
};

module.exports = config;
