/**
 * Mock for expo-secure-store
 * Provides in-memory storage for testing secure storage operations
 */

// In-memory storage to simulate SecureStore
const secureStorage: Map<string, string> = new Map();

/**
 * Get an item from secure storage
 */
export async function getItemAsync(key: string): Promise<string | null> {
  return secureStorage.get(key) ?? null;
}

/**
 * Set an item in secure storage
 */
export async function setItemAsync(key: string, value: string): Promise<void> {
  secureStorage.set(key, value);
}

/**
 * Delete an item from secure storage
 */
export async function deleteItemAsync(key: string): Promise<void> {
  secureStorage.delete(key);
}

/**
 * Check if secure store is available
 */
export function isAvailableAsync(): Promise<boolean> {
  return Promise.resolve(true);
}

/**
 * Clear all items from secure storage (test utility)
 */
export function __clearSecureStore(): void {
  secureStorage.clear();
}

/**
 * Get all keys in secure storage (test utility)
 */
export function __getSecureStoreKeys(): string[] {
  return Array.from(secureStorage.keys());
}

/**
 * Get the underlying storage map (test utility)
 */
export function __getSecureStoreMap(): Map<string, string> {
  return secureStorage;
}

// Security level constants
export const AFTER_FIRST_UNLOCK = "AFTER_FIRST_UNLOCK";
export const AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY = "AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY";
export const ALWAYS = "ALWAYS";
export const ALWAYS_THIS_DEVICE_ONLY = "ALWAYS_THIS_DEVICE_ONLY";
export const WHEN_UNLOCKED = "WHEN_UNLOCKED";
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = "WHEN_UNLOCKED_THIS_DEVICE_ONLY";
export const WHEN_PASSCODE_SET_THIS_DEVICE_ONLY = "WHEN_PASSCODE_SET_THIS_DEVICE_ONLY";

export default {
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
  isAvailableAsync,
  __clearSecureStore,
  __getSecureStoreKeys,
  __getSecureStoreMap,
  AFTER_FIRST_UNLOCK,
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  ALWAYS,
  ALWAYS_THIS_DEVICE_ONLY,
  WHEN_UNLOCKED,
  WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
};
