/**
 * Mock for expo winter runtime modules
 * Prevents winter runtime import errors in tests
 */

// Mock the winter runtime registry
export const __ExpoImportMetaRegistry = {
  get: jest.fn(() => ({})),
  set: jest.fn(),
  has: jest.fn(() => false),
};

// Mock runtime
export const runtime = {
  native: {
    require: jest.fn((_id: string) => {
      // Return empty module for any require
      return {};
    }),
  },
};

// Mock installGlobal
export const installGlobal = jest.fn();
export const getValue = jest.fn(() => ({}));

export default {
  __ExpoImportMetaRegistry,
  runtime,
  installGlobal,
  getValue,
};
