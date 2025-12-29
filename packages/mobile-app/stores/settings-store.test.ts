/**
 * Settings Store Tests
 * Comprehensive tests for user preferences, API keys, and privacy settings
 */

import { act } from "@testing-library/react-native";
import { useSettingsStore } from "./settings-store";

// ============================================================================
// Mocks
// ============================================================================

// Mock storage
const storageData: Record<string, string> = {};
jest.mock("../services/storage", () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(storageData[key] || null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    storageData[key] = value;
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    delete storageData[key];
    return Promise.resolve();
  }),
}));

// Get references to the mocked storage functions after the mock is defined
import * as storage from "../services/storage";
const mockGetItemAsync = storage.getItemAsync as jest.Mock;
const mockSetItemAsync = storage.setItemAsync as jest.Mock;
const _mockDeleteItemAsync = storage.deleteItemAsync as jest.Mock;

// Mock API client
const mockApiResponses: Record<string, unknown> = {};

jest.mock("../services/api/settings", () => ({
  listApiKeys: jest.fn(() =>
    Promise.resolve(mockApiResponses.listApiKeys || { data: null, error: null, status: 200 })
  ),
  createApiKey: jest.fn(() =>
    Promise.resolve(mockApiResponses.createApiKey || { data: null, error: null, status: 200 })
  ),
  deleteApiKey: jest.fn(() =>
    Promise.resolve(mockApiResponses.deleteApiKey || { data: null, error: null, status: 200 })
  ),
  getPreferences: jest.fn(() =>
    Promise.resolve(mockApiResponses.getPreferences || { data: null, error: null, status: 200 })
  ),
  updatePreferences: jest.fn(() =>
    Promise.resolve(mockApiResponses.updatePreferences || { data: null, error: null, status: 200 })
  ),
  deleteAccount: jest.fn(() =>
    Promise.resolve(mockApiResponses.deleteAccount || { data: null, error: null, status: 200 })
  ),
}));

// Get references to the mocked functions after import
import * as settingsApi from "../services/api/settings";
const mockListApiKeys = settingsApi.listApiKeys as jest.Mock;
const mockCreateApiKey = settingsApi.createApiKey as jest.Mock;
const mockDeleteApiKey = settingsApi.deleteApiKey as jest.Mock;
const mockGetPreferences = settingsApi.getPreferences as jest.Mock;
const mockUpdatePreferences = settingsApi.updatePreferences as jest.Mock;
const mockDeleteAccount = settingsApi.deleteAccount as jest.Mock;

function setupDefaultMockImplementations() {
  mockListApiKeys.mockImplementation(() =>
    Promise.resolve(mockApiResponses.listApiKeys || { data: null, error: null, status: 200 })
  );
  mockCreateApiKey.mockImplementation(() =>
    Promise.resolve(mockApiResponses.createApiKey || { data: null, error: null, status: 200 })
  );
  mockDeleteApiKey.mockImplementation(() =>
    Promise.resolve(mockApiResponses.deleteApiKey || { data: null, error: null, status: 200 })
  );
  mockGetPreferences.mockImplementation(() =>
    Promise.resolve(mockApiResponses.getPreferences || { data: null, error: null, status: 200 })
  );
  mockUpdatePreferences.mockImplementation(() =>
    Promise.resolve(mockApiResponses.updatePreferences || { data: null, error: null, status: 200 })
  );
  mockDeleteAccount.mockImplementation(() =>
    Promise.resolve(mockApiResponses.deleteAccount || { data: null, error: null, status: 200 })
  );
}

// ============================================================================
// Test Helpers
// ============================================================================

function resetStore() {
  useSettingsStore.setState({
    notifications: {
      emailNotifications: true,
      pushNotifications: false,
      enhancementCompleteNotifications: true,
      marketingNotifications: false,
    },
    privacy: {
      publicProfile: false,
      showActivity: true,
    },
    apiKeys: [],
    isLoadingApiKeys: false,
    apiKeysError: null,
    isLoadingPreferences: false,
    preferencesError: null,
    isSavingPreferences: false,
    isDeletingAccount: false,
    deleteAccountError: null,
    newlyCreatedKey: null,
  });
}

function clearMockResponses() {
  Object.keys(mockApiResponses).forEach((key) => {
    delete mockApiResponses[key];
  });
}

function clearMockStorage() {
  Object.keys(storageData).forEach((key) => {
    delete storageData[key];
  });
}

// ============================================================================
// Tests
// ============================================================================

describe("useSettingsStore", () => {
  beforeEach(() => {
    resetStore();
    clearMockResponses();
    clearMockStorage();
    jest.clearAllMocks();
    setupDefaultMockImplementations();
  });

  describe("initial state", () => {
    it("should have correct default notification preferences", () => {
      const state = useSettingsStore.getState();

      expect(state.notifications).toEqual({
        emailNotifications: true,
        pushNotifications: false,
        enhancementCompleteNotifications: true,
        marketingNotifications: false,
      });
    });

    it("should have correct default privacy preferences", () => {
      const state = useSettingsStore.getState();

      expect(state.privacy).toEqual({
        publicProfile: false,
        showActivity: true,
      });
    });

    it("should have empty API keys array", () => {
      const state = useSettingsStore.getState();

      expect(state.apiKeys).toEqual([]);
    });

    it("should have all loading states as false", () => {
      const state = useSettingsStore.getState();

      expect(state.isLoadingApiKeys).toBe(false);
      expect(state.isLoadingPreferences).toBe(false);
      expect(state.isSavingPreferences).toBe(false);
      expect(state.isDeletingAccount).toBe(false);
    });

    it("should have no errors", () => {
      const state = useSettingsStore.getState();

      expect(state.apiKeysError).toBeNull();
      expect(state.preferencesError).toBeNull();
      expect(state.deleteAccountError).toBeNull();
    });

    it("should have no newly created key", () => {
      const state = useSettingsStore.getState();

      expect(state.newlyCreatedKey).toBeNull();
    });
  });

  describe("initialize", () => {
    it("should load preferences from server successfully", async () => {
      mockApiResponses.getPreferences = {
        data: {
          preferences: {
            emailNotifications: false,
            pushNotifications: true,
            enhancementCompleteNotifications: false,
            marketingNotifications: true,
            publicProfile: true,
            showActivity: false,
          },
        },
        error: null,
        status: 200,
      };

      await act(async () => {
        await useSettingsStore.getState().initialize();
      });

      const state = useSettingsStore.getState();

      expect(state.notifications.emailNotifications).toBe(false);
      expect(state.notifications.pushNotifications).toBe(true);
      expect(state.notifications.enhancementCompleteNotifications).toBe(false);
      expect(state.notifications.marketingNotifications).toBe(true);
      expect(state.privacy.publicProfile).toBe(true);
      expect(state.privacy.showActivity).toBe(false);
      expect(state.isLoadingPreferences).toBe(false);
      expect(state.preferencesError).toBeNull();
    });

    it("should handle server error and keep local preferences", async () => {
      mockApiResponses.getPreferences = {
        data: null,
        error: "Server error",
        status: 500,
      };

      await act(async () => {
        await useSettingsStore.getState().initialize();
      });

      const state = useSettingsStore.getState();

      expect(state.isLoadingPreferences).toBe(false);
      expect(state.preferencesError).toBe("Server error");
      // Should keep default preferences
      expect(state.notifications.emailNotifications).toBe(true);
    });

    it("should handle exception during initialization", async () => {
      mockGetPreferences.mockRejectedValueOnce(new Error("Network error"));

      await act(async () => {
        await useSettingsStore.getState().initialize();
      });

      const state = useSettingsStore.getState();

      expect(state.isLoadingPreferences).toBe(false);
      expect(state.preferencesError).toBe("Network error");
    });

    it("should load persisted preferences before fetching from server", async () => {
      mockGetItemAsync.mockImplementation((key: string) => {
        if (key === "spike_notification_preferences") {
          return Promise.resolve(
            JSON.stringify({
              emailNotifications: false,
              pushNotifications: true,
              enhancementCompleteNotifications: true,
              marketingNotifications: false,
            }),
          );
        }
        return Promise.resolve(null);
      });

      mockApiResponses.getPreferences = {
        data: null,
        error: "Server unavailable",
        status: 503,
      };

      await act(async () => {
        await useSettingsStore.getState().initialize();
      });

      // Should have loaded from storage
      expect(storage.getItemAsync).toHaveBeenCalled();
    });
  });

  describe("updateNotificationPreference", () => {
    it("should update notification preference successfully", async () => {
      mockApiResponses.updatePreferences = {
        data: { success: true, preferences: {} },
        error: null,
        status: 200,
      };

      await act(async () => {
        await useSettingsStore.getState().updateNotificationPreference("emailNotifications", false);
      });

      const state = useSettingsStore.getState();

      expect(state.notifications.emailNotifications).toBe(false);
      expect(state.isSavingPreferences).toBe(false);
      expect(state.preferencesError).toBeNull();
    });

    it("should revert on server error", async () => {
      mockApiResponses.updatePreferences = {
        data: null,
        error: "Update failed",
        status: 500,
      };

      const initialValue = useSettingsStore.getState().notifications.emailNotifications;

      await act(async () => {
        await useSettingsStore.getState().updateNotificationPreference(
          "emailNotifications",
          !initialValue,
        );
      });

      const state = useSettingsStore.getState();

      expect(state.notifications.emailNotifications).toBe(initialValue);
      expect(state.preferencesError).toBe("Update failed");
    });

    it("should handle exception during update", async () => {
      mockUpdatePreferences.mockRejectedValueOnce(new Error("Network error"));

      const initialValue = useSettingsStore.getState().notifications.pushNotifications;

      await act(async () => {
        await useSettingsStore.getState().updateNotificationPreference(
          "pushNotifications",
          !initialValue,
        );
      });

      const state = useSettingsStore.getState();

      expect(state.notifications.pushNotifications).toBe(initialValue);
      expect(state.preferencesError).toBe("Network error");
    });

    it("should update all notification preference types", async () => {
      mockApiResponses.updatePreferences = {
        data: { success: true, preferences: {} },
        error: null,
        status: 200,
      };

      await act(async () => {
        await useSettingsStore.getState().updateNotificationPreference(
          "enhancementCompleteNotifications",
          false,
        );
      });

      expect(useSettingsStore.getState().notifications.enhancementCompleteNotifications).toBe(
        false,
      );

      await act(async () => {
        await useSettingsStore.getState().updateNotificationPreference(
          "marketingNotifications",
          true,
        );
      });

      expect(useSettingsStore.getState().notifications.marketingNotifications).toBe(true);
    });
  });

  describe("updatePrivacyPreference", () => {
    it("should update privacy preference successfully", async () => {
      mockApiResponses.updatePreferences = {
        data: { success: true, preferences: {} },
        error: null,
        status: 200,
      };

      await act(async () => {
        await useSettingsStore.getState().updatePrivacyPreference("publicProfile", true);
      });

      const state = useSettingsStore.getState();

      expect(state.privacy.publicProfile).toBe(true);
      expect(state.isSavingPreferences).toBe(false);
    });

    it("should revert on server error", async () => {
      mockApiResponses.updatePreferences = {
        data: null,
        error: "Update failed",
        status: 500,
      };

      const initialValue = useSettingsStore.getState().privacy.showActivity;

      await act(async () => {
        await useSettingsStore.getState().updatePrivacyPreference("showActivity", !initialValue);
      });

      const state = useSettingsStore.getState();

      expect(state.privacy.showActivity).toBe(initialValue);
      expect(state.preferencesError).toBe("Update failed");
    });

    it("should handle exception during privacy update", async () => {
      mockUpdatePreferences.mockRejectedValueOnce(new Error("Network error"));

      const initialValue = useSettingsStore.getState().privacy.publicProfile;

      await act(async () => {
        await useSettingsStore.getState().updatePrivacyPreference("publicProfile", !initialValue);
      });

      const state = useSettingsStore.getState();

      expect(state.privacy.publicProfile).toBe(initialValue);
      expect(state.preferencesError).toBe("Network error");
    });
  });

  describe("updatePreference", () => {
    it("should route notification preferences correctly", async () => {
      mockApiResponses.updatePreferences = {
        data: { success: true, preferences: {} },
        error: null,
        status: 200,
      };

      await act(async () => {
        await useSettingsStore.getState().updatePreference("emailNotifications", false);
      });

      expect(useSettingsStore.getState().notifications.emailNotifications).toBe(false);
    });

    it("should route privacy preferences correctly", async () => {
      mockApiResponses.updatePreferences = {
        data: { success: true, preferences: {} },
        error: null,
        status: 200,
      };

      await act(async () => {
        await useSettingsStore.getState().updatePreference("publicProfile", true);
      });

      expect(useSettingsStore.getState().privacy.publicProfile).toBe(true);
    });
  });

  describe("fetchApiKeys", () => {
    it("should fetch API keys successfully", async () => {
      const mockKeys = [
        {
          id: "key-1",
          name: "Test Key 1",
          keyPrefix: "sk_test_abc",
          lastUsedAt: "2024-01-01T00:00:00.000Z",
          isActive: true,
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "key-2",
          name: "Test Key 2",
          keyPrefix: "sk_test_def",
          lastUsedAt: null,
          isActive: true,
          createdAt: "2024-01-02T00:00:00.000Z",
        },
      ];

      mockApiResponses.listApiKeys = {
        data: { apiKeys: mockKeys },
        error: null,
        status: 200,
      };

      await act(async () => {
        await useSettingsStore.getState().fetchApiKeys();
      });

      const state = useSettingsStore.getState();

      expect(state.apiKeys).toEqual(mockKeys);
      expect(state.isLoadingApiKeys).toBe(false);
      expect(state.apiKeysError).toBeNull();
    });

    it("should handle fetch error", async () => {
      mockApiResponses.listApiKeys = {
        data: null,
        error: "Failed to fetch",
        status: 500,
      };

      await act(async () => {
        await useSettingsStore.getState().fetchApiKeys();
      });

      const state = useSettingsStore.getState();

      expect(state.apiKeys).toEqual([]);
      expect(state.isLoadingApiKeys).toBe(false);
      expect(state.apiKeysError).toBe("Failed to fetch");
    });

    it("should handle exception during fetch", async () => {
      mockListApiKeys.mockRejectedValueOnce(new Error("Network error"));

      await act(async () => {
        await useSettingsStore.getState().fetchApiKeys();
      });

      const state = useSettingsStore.getState();

      expect(state.isLoadingApiKeys).toBe(false);
      expect(state.apiKeysError).toBe("Network error");
    });

    it("should set loading state during fetch", async () => {
      let loadingStateDuringFetch = false;

      mockApiResponses.listApiKeys = {
        data: { apiKeys: [] },
        error: null,
        status: 200,
      };

      mockListApiKeys.mockImplementationOnce(() => {
        loadingStateDuringFetch = useSettingsStore.getState().isLoadingApiKeys;
        return Promise.resolve(mockApiResponses.listApiKeys);
      });

      await act(async () => {
        await useSettingsStore.getState().fetchApiKeys();
      });

      expect(loadingStateDuringFetch).toBe(true);
    });
  });

  describe("createApiKey", () => {
    it("should create API key successfully", async () => {
      const mockNewKey = {
        id: "new-key-1",
        name: "New API Key",
        key: "sk_test_full_key_123",
        keyPrefix: "sk_test_ful",
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      mockApiResponses.createApiKey = {
        data: {
          apiKey: mockNewKey,
          message: "Key created successfully",
        },
        error: null,
        status: 200,
      };

      let result;
      await act(async () => {
        result = await useSettingsStore.getState().createApiKey("New API Key");
      });

      const state = useSettingsStore.getState();

      expect(result).toEqual({ success: true });
      expect(state.apiKeys.length).toBe(1);
      expect(state.apiKeys[0].name).toBe("New API Key");
      expect(state.newlyCreatedKey).toEqual(mockNewKey);
    });

    it("should handle create error", async () => {
      mockApiResponses.createApiKey = {
        data: null,
        error: "Maximum keys reached",
        status: 400,
      };

      let result;
      await act(async () => {
        result = await useSettingsStore.getState().createApiKey("New Key");
      });

      expect(result).toEqual({
        success: false,
        error: "Maximum keys reached",
      });
      expect(useSettingsStore.getState().apiKeys.length).toBe(0);
    });

    it("should handle exception during create", async () => {
      mockCreateApiKey.mockRejectedValueOnce(new Error("Network error"));

      let result;
      await act(async () => {
        result = await useSettingsStore.getState().createApiKey("New Key");
      });

      expect(result).toEqual({
        success: false,
        error: "Network error",
      });
    });

    it("should prepend new key to existing keys", async () => {
      // Set up existing keys
      useSettingsStore.setState({
        apiKeys: [
          {
            id: "existing-key",
            name: "Existing Key",
            keyPrefix: "sk_test_old",
            lastUsedAt: null,
            isActive: true,
            createdAt: "2024-01-01T00:00:00.000Z",
          },
        ],
      });

      mockApiResponses.createApiKey = {
        data: {
          apiKey: {
            id: "new-key",
            name: "New Key",
            key: "sk_test_new_full",
            keyPrefix: "sk_test_new",
            createdAt: "2024-01-02T00:00:00.000Z",
          },
          message: "Success",
        },
        error: null,
        status: 200,
      };

      await act(async () => {
        await useSettingsStore.getState().createApiKey("New Key");
      });

      const state = useSettingsStore.getState();

      expect(state.apiKeys.length).toBe(2);
      expect(state.apiKeys[0].name).toBe("New Key");
      expect(state.apiKeys[1].name).toBe("Existing Key");
    });
  });

  describe("deleteApiKey", () => {
    it("should delete API key successfully", async () => {
      useSettingsStore.setState({
        apiKeys: [
          {
            id: "key-to-delete",
            name: "Key to Delete",
            keyPrefix: "sk_test_del",
            lastUsedAt: null,
            isActive: true,
            createdAt: "2024-01-01T00:00:00.000Z",
          },
          {
            id: "key-to-keep",
            name: "Key to Keep",
            keyPrefix: "sk_test_kee",
            lastUsedAt: null,
            isActive: true,
            createdAt: "2024-01-01T00:00:00.000Z",
          },
        ],
      });

      mockApiResponses.deleteApiKey = {
        data: { success: true, message: "Deleted" },
        error: null,
        status: 200,
      };

      let result;
      await act(async () => {
        result = await useSettingsStore.getState().deleteApiKey("key-to-delete");
      });

      const state = useSettingsStore.getState();

      expect(result).toEqual({ success: true });
      expect(state.apiKeys.length).toBe(1);
      expect(state.apiKeys[0].id).toBe("key-to-keep");
    });

    it("should handle delete error", async () => {
      useSettingsStore.setState({
        apiKeys: [
          {
            id: "key-1",
            name: "Key 1",
            keyPrefix: "sk_test",
            lastUsedAt: null,
            isActive: true,
            createdAt: "2024-01-01T00:00:00.000Z",
          },
        ],
      });

      mockApiResponses.deleteApiKey = {
        data: null,
        error: "Key not found",
        status: 404,
      };

      let result;
      await act(async () => {
        result = await useSettingsStore.getState().deleteApiKey("key-1");
      });

      expect(result).toEqual({
        success: false,
        error: "Key not found",
      });
      // Key should not be removed from state
      expect(useSettingsStore.getState().apiKeys.length).toBe(1);
    });

    it("should handle exception during delete", async () => {
      mockDeleteApiKey.mockRejectedValueOnce(new Error("Network error"));

      let result;
      await act(async () => {
        result = await useSettingsStore.getState().deleteApiKey("some-key");
      });

      expect(result).toEqual({
        success: false,
        error: "Network error",
      });
    });

    it("should handle delete with success false response", async () => {
      mockApiResponses.deleteApiKey = {
        data: { success: false, message: "Key not found" },
        error: null,
        status: 200,
      };

      let result;
      await act(async () => {
        result = await useSettingsStore.getState().deleteApiKey("nonexistent");
      });

      expect(result).toEqual({
        success: false,
        error: "Failed to delete API key",
      });
    });
  });

  describe("clearNewlyCreatedKey", () => {
    it("should clear the newly created key", () => {
      useSettingsStore.setState({
        newlyCreatedKey: {
          id: "test-key",
          name: "Test",
          key: "sk_test_full",
          keyPrefix: "sk_test",
          lastUsedAt: null,
          isActive: true,
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      });

      act(() => {
        useSettingsStore.getState().clearNewlyCreatedKey();
      });

      expect(useSettingsStore.getState().newlyCreatedKey).toBeNull();
    });
  });

  describe("deleteAccount", () => {
    it("should delete account successfully", async () => {
      mockApiResponses.deleteAccount = {
        data: { success: true, message: "Account deleted" },
        error: null,
        status: 200,
      };

      let result;
      await act(async () => {
        result = await useSettingsStore.getState().deleteAccount();
      });

      const state = useSettingsStore.getState();

      expect(result).toEqual({ success: true });
      expect(state.isDeletingAccount).toBe(false);
      expect(state.deleteAccountError).toBeNull();
    });

    it("should handle delete account error", async () => {
      mockApiResponses.deleteAccount = {
        data: null,
        error: "Cannot delete account",
        status: 400,
      };

      let result;
      await act(async () => {
        result = await useSettingsStore.getState().deleteAccount();
      });

      const state = useSettingsStore.getState();

      expect(result).toEqual({
        success: false,
        error: "Cannot delete account",
      });
      expect(state.isDeletingAccount).toBe(false);
      expect(state.deleteAccountError).toBe("Cannot delete account");
    });

    it("should handle exception during delete account", async () => {
      mockDeleteAccount.mockRejectedValueOnce(new Error("Network error"));

      let result;
      await act(async () => {
        result = await useSettingsStore.getState().deleteAccount();
      });

      const state = useSettingsStore.getState();

      expect(result).toEqual({
        success: false,
        error: "Network error",
      });
      expect(state.deleteAccountError).toBe("Network error");
    });

    it("should handle delete account with success false", async () => {
      mockApiResponses.deleteAccount = {
        data: { success: false, message: "Failed" },
        error: null,
        status: 200,
      };

      let result;
      await act(async () => {
        result = await useSettingsStore.getState().deleteAccount();
      });

      expect(result).toEqual({
        success: false,
        error: "Failed to delete account",
      });
    });

    it("should set loading state during delete", async () => {
      let loadingStateDuringDelete = false;

      mockApiResponses.deleteAccount = {
        data: { success: true, message: "Deleted" },
        error: null,
        status: 200,
      };

      mockDeleteAccount.mockImplementationOnce(() => {
        loadingStateDuringDelete = useSettingsStore.getState().isDeletingAccount;
        return Promise.resolve(mockApiResponses.deleteAccount);
      });

      await act(async () => {
        await useSettingsStore.getState().deleteAccount();
      });

      expect(loadingStateDuringDelete).toBe(true);
    });
  });

  describe("clearErrors", () => {
    it("should clear all error states", () => {
      useSettingsStore.setState({
        apiKeysError: "API keys error",
        preferencesError: "Preferences error",
        deleteAccountError: "Delete account error",
      });

      act(() => {
        useSettingsStore.getState().clearErrors();
      });

      const state = useSettingsStore.getState();

      expect(state.apiKeysError).toBeNull();
      expect(state.preferencesError).toBeNull();
      expect(state.deleteAccountError).toBeNull();
    });
  });

  describe("persistPreferences", () => {
    it("should save preferences to storage", async () => {
      await act(async () => {
        await useSettingsStore.getState().persistPreferences();
      });

      expect(mockSetItemAsync).toHaveBeenCalledWith(
        "spike_notification_preferences",
        expect.any(String),
      );
      expect(mockSetItemAsync).toHaveBeenCalledWith(
        "spike_privacy_preferences",
        expect.any(String),
      );
    });

    it("should handle storage errors gracefully", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      mockSetItemAsync.mockRejectedValueOnce(new Error("Storage full"));

      await act(async () => {
        await useSettingsStore.getState().persistPreferences();
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("loadPersistedPreferences", () => {
    it("should load preferences from storage", async () => {
      mockGetItemAsync.mockImplementation((key: string) => {
        if (key === "spike_notification_preferences") {
          return Promise.resolve(
            JSON.stringify({
              emailNotifications: false,
              pushNotifications: true,
              enhancementCompleteNotifications: false,
              marketingNotifications: true,
            }),
          );
        }
        if (key === "spike_privacy_preferences") {
          return Promise.resolve(
            JSON.stringify({
              publicProfile: true,
              showActivity: false,
            }),
          );
        }
        return Promise.resolve(null);
      });

      await act(async () => {
        await useSettingsStore.getState().loadPersistedPreferences();
      });

      const state = useSettingsStore.getState();

      expect(state.notifications.emailNotifications).toBe(false);
      expect(state.notifications.pushNotifications).toBe(true);
      expect(state.privacy.publicProfile).toBe(true);
      expect(state.privacy.showActivity).toBe(false);
    });

    it("should use defaults when storage is empty", async () => {
      mockGetItemAsync.mockResolvedValue(null);

      await act(async () => {
        await useSettingsStore.getState().loadPersistedPreferences();
      });

      const state = useSettingsStore.getState();

      expect(state.notifications.emailNotifications).toBe(true);
      expect(state.privacy.publicProfile).toBe(false);
    });

    it("should handle storage errors and use defaults", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      mockGetItemAsync.mockRejectedValue(new Error("Storage error"));

      await act(async () => {
        await useSettingsStore.getState().loadPersistedPreferences();
      });

      const state = useSettingsStore.getState();

      expect(state.notifications.emailNotifications).toBe(true);
      expect(state.privacy.publicProfile).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
