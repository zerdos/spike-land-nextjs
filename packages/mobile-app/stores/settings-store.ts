/**
 * Settings Store
 * Manages user preferences, API keys, and privacy settings with Zustand
 */

import { create } from "zustand";
import {
  ApiKey,
  createApiKey as createApiKeyApi,
  deleteAccount as deleteAccountApi,
  deleteApiKey as deleteApiKeyApi,
  getPreferences as getPreferencesApi,
  listApiKeys as listApiKeysApi,
  updatePreferences as updatePreferencesApi,
  UserPreferences,
} from "../services/api/settings";
import * as storage from "../services/storage";

// ============================================================================
// Types
// ============================================================================

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  enhancementCompleteNotifications: boolean;
  marketingNotifications: boolean;
}

export interface PrivacyPreferences {
  publicProfile: boolean;
  showActivity: boolean;
}

export interface ApiKeyWithFullKey extends ApiKey {
  key: string;
}

interface SettingsState {
  // Notification preferences
  notifications: NotificationPreferences;

  // Privacy preferences
  privacy: PrivacyPreferences;

  // API Keys
  apiKeys: ApiKey[];
  isLoadingApiKeys: boolean;
  apiKeysError: string | null;

  // Preferences loading state
  isLoadingPreferences: boolean;
  preferencesError: string | null;
  isSavingPreferences: boolean;

  // Account deletion
  isDeletingAccount: boolean;
  deleteAccountError: string | null;

  // Newly created API key (shown once)
  newlyCreatedKey: ApiKeyWithFullKey | null;
}

interface SettingsActions {
  // Initialization
  initialize: () => Promise<void>;

  // Notification preferences
  updateNotificationPreference: <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K],
  ) => Promise<void>;

  // Privacy preferences
  updatePrivacyPreference: <K extends keyof PrivacyPreferences>(
    key: K,
    value: PrivacyPreferences[K],
  ) => Promise<void>;

  // Generic preference update
  updatePreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K],
  ) => Promise<void>;

  // API Keys
  fetchApiKeys: () => Promise<void>;
  createApiKey: (name: string) => Promise<{ success: boolean; error?: string; }>;
  deleteApiKey: (keyId: string) => Promise<{ success: boolean; error?: string; }>;
  clearNewlyCreatedKey: () => void;

  // Account
  deleteAccount: () => Promise<{ success: boolean; error?: string; }>;

  // Error handling
  clearErrors: () => void;

  // Persist preferences to local storage
  persistPreferences: () => Promise<void>;

  // Load preferences from local storage
  loadPersistedPreferences: () => Promise<void>;
}

export type SettingsStore = SettingsState & SettingsActions;

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  NOTIFICATIONS: "spike_notification_preferences",
  PRIVACY: "spike_privacy_preferences",
} as const;

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  emailNotifications: true,
  pushNotifications: false,
  enhancementCompleteNotifications: true,
  marketingNotifications: false,
};

const DEFAULT_PRIVACY: PrivacyPreferences = {
  publicProfile: false,
  showActivity: true,
};

// ============================================================================
// Store
// ============================================================================

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  // Initial state
  notifications: { ...DEFAULT_NOTIFICATIONS },
  privacy: { ...DEFAULT_PRIVACY },
  apiKeys: [],
  isLoadingApiKeys: false,
  apiKeysError: null,
  isLoadingPreferences: false,
  preferencesError: null,
  isSavingPreferences: false,
  isDeletingAccount: false,
  deleteAccountError: null,
  newlyCreatedKey: null,

  // Actions
  initialize: async () => {
    // Load persisted preferences first (for offline support)
    await get().loadPersistedPreferences();

    // Then fetch from server
    set({ isLoadingPreferences: true, preferencesError: null });

    try {
      const response = await getPreferencesApi();

      if (response.error || !response.data) {
        // Keep local preferences if server fails
        set({
          isLoadingPreferences: false,
          preferencesError: response.error || "Failed to load preferences",
        });
        return;
      }

      const { preferences } = response.data;

      set({
        notifications: {
          emailNotifications: preferences.emailNotifications,
          pushNotifications: preferences.pushNotifications,
          enhancementCompleteNotifications: preferences.enhancementCompleteNotifications,
          marketingNotifications: preferences.marketingNotifications,
        },
        privacy: {
          publicProfile: preferences.publicProfile,
          showActivity: preferences.showActivity,
        },
        isLoadingPreferences: false,
        preferencesError: null,
      });

      // Persist the server preferences locally
      await get().persistPreferences();
    } catch (error) {
      set({
        isLoadingPreferences: false,
        preferencesError: error instanceof Error ? error.message : "Failed to load preferences",
      });
    }
  },

  updateNotificationPreference: async (key, value) => {
    const previousNotifications = { ...get().notifications };

    // Optimistic update
    set((state) => ({
      notifications: { ...state.notifications, [key]: value },
      isSavingPreferences: true,
    }));

    try {
      const response = await updatePreferencesApi({ [key]: value });

      if (response.error) {
        // Revert on error
        set({
          notifications: previousNotifications,
          isSavingPreferences: false,
          preferencesError: response.error,
        });
        return;
      }

      set({ isSavingPreferences: false, preferencesError: null });
      await get().persistPreferences();
    } catch (error) {
      set({
        notifications: previousNotifications,
        isSavingPreferences: false,
        preferencesError: error instanceof Error ? error.message : "Failed to update preference",
      });
    }
  },

  updatePrivacyPreference: async (key, value) => {
    const previousPrivacy = { ...get().privacy };

    // Optimistic update
    set((state) => ({
      privacy: { ...state.privacy, [key]: value },
      isSavingPreferences: true,
    }));

    try {
      const response = await updatePreferencesApi({ [key]: value });

      if (response.error) {
        // Revert on error
        set({
          privacy: previousPrivacy,
          isSavingPreferences: false,
          preferencesError: response.error,
        });
        return;
      }

      set({ isSavingPreferences: false, preferencesError: null });
      await get().persistPreferences();
    } catch (error) {
      set({
        privacy: previousPrivacy,
        isSavingPreferences: false,
        preferencesError: error instanceof Error ? error.message : "Failed to update preference",
      });
    }
  },

  updatePreference: async (key, value) => {
    // Determine which category the preference belongs to
    if (key in DEFAULT_NOTIFICATIONS) {
      await get().updateNotificationPreference(
        key as keyof NotificationPreferences,
        value as boolean,
      );
    } else if (key in DEFAULT_PRIVACY) {
      await get().updatePrivacyPreference(
        key as keyof PrivacyPreferences,
        value as boolean,
      );
    }
  },

  fetchApiKeys: async () => {
    set({ isLoadingApiKeys: true, apiKeysError: null });

    try {
      const response = await listApiKeysApi();

      if (response.error || !response.data) {
        set({
          isLoadingApiKeys: false,
          apiKeysError: response.error || "Failed to fetch API keys",
        });
        return;
      }

      set({
        apiKeys: response.data.apiKeys,
        isLoadingApiKeys: false,
        apiKeysError: null,
      });
    } catch (error) {
      set({
        isLoadingApiKeys: false,
        apiKeysError: error instanceof Error ? error.message : "Failed to fetch API keys",
      });
    }
  },

  createApiKey: async (name) => {
    try {
      const response = await createApiKeyApi(name);

      if (response.error || !response.data) {
        return {
          success: false,
          error: response.error || "Failed to create API key",
        };
      }

      const newKey = response.data.apiKey;

      set((state) => ({
        apiKeys: [
          {
            id: newKey.id,
            name: newKey.name,
            keyPrefix: newKey.keyPrefix,
            lastUsedAt: null,
            isActive: true,
            createdAt: newKey.createdAt,
          },
          ...state.apiKeys,
        ],
        newlyCreatedKey: newKey,
      }));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create API key",
      };
    }
  },

  deleteApiKey: async (keyId) => {
    try {
      const response = await deleteApiKeyApi(keyId);

      if (response.error || !response.data?.success) {
        return {
          success: false,
          error: response.error || "Failed to delete API key",
        };
      }

      set((state) => ({
        apiKeys: state.apiKeys.filter((key) => key.id !== keyId),
      }));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete API key",
      };
    }
  },

  clearNewlyCreatedKey: () => {
    set({ newlyCreatedKey: null });
  },

  deleteAccount: async () => {
    set({ isDeletingAccount: true, deleteAccountError: null });

    try {
      const response = await deleteAccountApi();

      if (response.error || !response.data?.success) {
        set({
          isDeletingAccount: false,
          deleteAccountError: response.error || "Failed to delete account",
        });
        return {
          success: false,
          error: response.error || "Failed to delete account",
        };
      }

      set({ isDeletingAccount: false, deleteAccountError: null });
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete account";
      set({
        isDeletingAccount: false,
        deleteAccountError: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  clearErrors: () => {
    set({
      apiKeysError: null,
      preferencesError: null,
      deleteAccountError: null,
    });
  },

  persistPreferences: async () => {
    const { notifications, privacy } = get();

    try {
      await storage.setItemAsync(
        STORAGE_KEYS.NOTIFICATIONS,
        JSON.stringify(notifications),
      );
      await storage.setItemAsync(
        STORAGE_KEYS.PRIVACY,
        JSON.stringify(privacy),
      );
    } catch (error) {
      console.error("Failed to persist preferences:", error);
    }
  },

  loadPersistedPreferences: async () => {
    try {
      const notificationsJson = await storage.getItemAsync(
        STORAGE_KEYS.NOTIFICATIONS,
      );
      const privacyJson = await storage.getItemAsync(STORAGE_KEYS.PRIVACY);

      const notifications = notificationsJson
        ? JSON.parse(notificationsJson)
        : DEFAULT_NOTIFICATIONS;
      const privacy = privacyJson
        ? JSON.parse(privacyJson)
        : DEFAULT_PRIVACY;

      set({ notifications, privacy });
    } catch (error) {
      console.error("Failed to load persisted preferences:", error);
      // Use defaults on error
      set({
        notifications: { ...DEFAULT_NOTIFICATIONS },
        privacy: { ...DEFAULT_PRIVACY },
      });
    }
  },
}));
