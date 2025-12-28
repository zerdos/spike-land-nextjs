/**
 * Cross-platform secure storage
 * Uses SecureStore on native and localStorage on web
 */

import { Platform } from "react-native";

// Dynamically import SecureStore only on native
let SecureStore: typeof import("expo-secure-store") | null = null;

if (Platform.OS !== "web") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  SecureStore = require("expo-secure-store");
}

/**
 * Get an item from secure storage
 */
export async function getItemAsync(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }
  return SecureStore?.getItemAsync(key) ?? null;
}

/**
 * Set an item in secure storage
 */
export async function setItemAsync(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore?.setItemAsync(key, value);
}

/**
 * Delete an item from secure storage
 */
export async function deleteItemAsync(key: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore?.deleteItemAsync(key);
}
