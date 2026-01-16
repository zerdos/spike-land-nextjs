/**
 * Shared Type Utilities for Test Mocks
 * Provides proper type definitions for common mock patterns
 */

import type { ReactNode } from "react";
import type { SwitchProps, TextInputProps, TouchableOpacityProps, ViewProps } from "react-native";

// ============================================================================
// Tamagui Component Mock Types
// ============================================================================

export interface MockButtonProps extends TouchableOpacityProps {
  children?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  testID?: string;
}

export interface MockCardProps extends ViewProps {
  children?: ReactNode;
}

export interface MockDialogProps {
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface MockDialogSubComponentProps {
  children?: ReactNode;
}

export interface MockInputProps extends TextInputProps {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  id?: string;
  testID?: string;
}

export interface MockTextProps {
  children?: ReactNode;
}

export interface MockStackProps extends ViewProps {
  children?: ReactNode;
}

export interface MockSwitchProps extends Omit<SwitchProps, "value" | "onValueChange"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  testID?: string;
}

// ============================================================================
// Alert Button Type
// ============================================================================

export interface AlertButton {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
}

// ============================================================================
// Store Mock Types
// ============================================================================

export interface MockAuthStore {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: {
    id: string;
    email: string;
    name: string;
  } | null;
  signOut?: jest.Mock<Promise<void>, []>;
  initialize?: jest.Mock<Promise<void>, []>;
}

export interface MockApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface MockApiKeyWithFullKey extends MockApiKey {
  key: string;
}

export interface MockSettingsStore {
  apiKeys: MockApiKey[];
  isLoadingApiKeys: boolean;
  apiKeysError: string | null;
  newlyCreatedKey: MockApiKeyWithFullKey | null;
  fetchApiKeys: jest.Mock<Promise<void>, []>;
  createApiKey: jest.Mock<
    Promise<{ success: boolean; error?: string; }>,
    [string]
  >;
  deleteApiKey: jest.Mock<
    Promise<{ success: boolean; error?: string; }>,
    [string]
  >;
  clearNewlyCreatedKey: jest.Mock<void, []>;
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    enhancementCompleteNotifications: boolean;
    marketingNotifications: boolean;
  };
  privacy: {
    publicProfile: boolean;
    showActivity: boolean;
  };
  isSavingPreferences: boolean;
  preferencesError: string | null;
  isDeletingAccount: boolean;
  deleteAccountError: string | null;
  updateNotificationPreference: jest.Mock<Promise<void>, [string, boolean]>;
  updatePrivacyPreference: jest.Mock<Promise<void>, [string, boolean]>;
  deleteAccount: jest.Mock<Promise<{ success: boolean; error?: string; }>, []>;
  initialize: jest.Mock<Promise<void>, []>;
}

export interface MockRouter {
  back: jest.Mock<void, []>;
  push: jest.Mock<void, [string]>;
  replace: jest.Mock<void, [string]>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates a typed mock function with proper Jest types
 */
export function createMockFn<TReturn, TArgs extends unknown[]>(): jest.Mock<
  TReturn,
  TArgs
> {
  return jest.fn<TReturn, TArgs>();
}

/**
 * Creates a mock function that returns a Promise
 */
export function createAsyncMockFn<TReturn, TArgs extends unknown[]>(
  returnValue?: TReturn,
): jest.Mock<Promise<TReturn>, TArgs> {
  return jest.fn<Promise<TReturn>, TArgs>(() => Promise.resolve(returnValue as TReturn));
}
