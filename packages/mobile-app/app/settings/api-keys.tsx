/**
 * API Keys Screen
 * Manage API keys for programmatic access to Spike Land services
 */

import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, RefreshControl } from "react-native";
import {
  Button,
  Card,
  Dialog,
  H3,
  H4,
  Input,
  Label,
  Paragraph,
  Text,
  XStack,
  YStack,
} from "tamagui";

import type { ApiKey } from "../../services/api/settings";
import { useAuthStore } from "../../stores";
import { useSettingsStore } from "../../stores/settings-store";

// ============================================================================
// Types
// ============================================================================

interface ApiKeyItemProps {
  apiKey: ApiKey;
  onDelete: (id: string) => void;
  onCopy: (prefix: string) => void;
}

// ============================================================================
// Components
// ============================================================================

function ApiKeyItem({ apiKey, onDelete, onCopy }: ApiKeyItemProps) {
  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete API Key",
      `Are you sure you want to delete "${apiKey.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(apiKey.id),
        },
      ],
      { cancelable: true },
    );
  }, [apiKey.id, apiKey.name, onDelete]);

  const handleCopy = useCallback(() => {
    onCopy(apiKey.keyPrefix);
  }, [apiKey.keyPrefix, onCopy]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card elevate size="$4" bordered marginBottom="$3">
      <YStack padding="$4" space="$3">
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack flex={1} marginRight="$2">
            <Text fontSize="$4" fontWeight="600">
              {apiKey.name}
            </Text>
            <XStack space="$2" alignItems="center" marginTop="$1">
              <Text fontSize="$3" color="$gray11" fontFamily="$mono">
                {apiKey.keyPrefix}...
              </Text>
              <Button
                size="$2"
                chromeless
                onPress={handleCopy}
                icon={<Ionicons name="copy-outline" size={16} color="#666" />}
              />
            </XStack>
          </YStack>
          <XStack space="$2">
            {apiKey.isActive
              ? (
                <XStack
                  backgroundColor="$green3"
                  paddingHorizontal="$2"
                  paddingVertical="$1"
                  borderRadius="$2"
                >
                  <Text fontSize="$2" color="$green11">
                    Active
                  </Text>
                </XStack>
              )
              : (
                <XStack
                  backgroundColor="$red3"
                  paddingHorizontal="$2"
                  paddingVertical="$1"
                  borderRadius="$2"
                >
                  <Text fontSize="$2" color="$red11">
                    Revoked
                  </Text>
                </XStack>
              )}
          </XStack>
        </XStack>

        <XStack justifyContent="space-between" alignItems="center">
          <YStack>
            <Text fontSize="$2" color="$gray10">
              Created: {formatDate(apiKey.createdAt)}
            </Text>
            <Text fontSize="$2" color="$gray10">
              Last used: {formatDate(apiKey.lastUsedAt)}
            </Text>
          </YStack>
          <Button
            size="$3"
            backgroundColor="$red3"
            onPress={handleDelete}
            disabled={!apiKey.isActive}
            icon={<Ionicons name="trash-outline" size={18} color="#EF4444" />}
          >
            <Text color="$red10" fontSize="$2">
              Delete
            </Text>
          </Button>
        </XStack>
      </YStack>
    </Card>
  );
}

function NewKeyDialog({
  visible,
  fullKey,
  keyName,
  onClose,
  onCopy,
}: {
  visible: boolean;
  fullKey: string;
  keyName: string;
  onClose: () => void;
  onCopy: () => void;
}) {
  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          key="overlay"
          animation="quick"
          opacity={0.5}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />
        <Dialog.Content
          bordered
          elevate
          key="content"
          animation={[
            "quick",
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
          exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
          space
          margin="$4"
        >
          <Dialog.Title>
            <XStack space="$2" alignItems="center">
              <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
              <Text fontSize="$5" fontWeight="600">
                API Key Created
              </Text>
            </XStack>
          </Dialog.Title>

          <Dialog.Description>
            <YStack space="$3">
              <Paragraph color="$gray11">
                Your new API key "{keyName}" has been created. Copy it now - you will not be able to
                see it again!
              </Paragraph>

              <Card backgroundColor="$gray2" padding="$3" borderRadius="$3">
                <Text
                  fontSize="$3"
                  fontFamily="$mono"
                  color="$gray12"
                  selectable
                >
                  {fullKey}
                </Text>
              </Card>

              <XStack
                backgroundColor="$orange3"
                padding="$3"
                borderRadius="$3"
                space="$2"
              >
                <Ionicons name="warning" size={20} color="#F59E0B" />
                <Text fontSize="$2" color="$orange11" flex={1}>
                  This key will only be shown once. Store it securely.
                </Text>
              </XStack>
            </YStack>
          </Dialog.Description>

          <XStack space="$3" justifyContent="flex-end">
            <Button size="$4" theme="active" onPress={onCopy}>
              <XStack space="$2" alignItems="center">
                <Ionicons name="copy-outline" size={18} color="white" />
                <Text color="white" fontWeight="600">
                  Copy Key
                </Text>
              </XStack>
            </Button>
            <Button size="$4" onPress={onClose}>
              <Text>Done</Text>
            </Button>
          </XStack>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}

function CreateKeyDialog({
  visible,
  onClose,
  onCreate,
  isCreating,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  isCreating: boolean;
}) {
  const [name, setName] = useState("");

  const handleCreate = useCallback(() => {
    if (name.trim()) {
      onCreate(name.trim());
    }
  }, [name, onCreate]);

  const handleClose = useCallback(() => {
    setName("");
    onClose();
  }, [onClose]);

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          key="overlay"
          animation="quick"
          opacity={0.5}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />
        <Dialog.Content
          bordered
          elevate
          key="content"
          animation={[
            "quick",
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
          exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
          space
          margin="$4"
        >
          <Dialog.Title>Create API Key</Dialog.Title>

          <Dialog.Description>
            <YStack space="$3">
              <Paragraph color="$gray11">
                Give your API key a descriptive name to help you identify it later.
              </Paragraph>

              <YStack space="$2">
                <Label htmlFor="keyName" fontSize="$2" color="$gray11">
                  Key Name
                </Label>
                <Input
                  id="keyName"
                  size="$4"
                  placeholder="e.g., Production Server"
                  value={name}
                  onChangeText={setName}
                  maxLength={50}
                  autoFocus
                />
                <Text fontSize="$1" color="$gray10">
                  Maximum 50 characters
                </Text>
              </YStack>
            </YStack>
          </Dialog.Description>

          <XStack space="$3" justifyContent="flex-end">
            <Button size="$4" onPress={handleClose} disabled={isCreating}>
              <Text>Cancel</Text>
            </Button>
            <Button
              size="$4"
              theme="active"
              onPress={handleCreate}
              disabled={!name.trim() || isCreating}
            >
              {isCreating
                ? <ActivityIndicator size="small" color="white" />
                : (
                  <Text color="white" fontWeight="600">
                    Create
                  </Text>
                )}
            </Button>
          </XStack>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}

// ============================================================================
// Main Screen
// ============================================================================

export default function ApiKeysScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const {
    apiKeys,
    isLoadingApiKeys,
    apiKeysError,
    newlyCreatedKey,
    fetchApiKeys,
    createApiKey,
    deleteApiKey,
    clearNewlyCreatedKey,
  } = useSettingsStore();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch API keys on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchApiKeys();
    }
  }, [isAuthenticated, fetchApiKeys]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchApiKeys();
    setIsRefreshing(false);
  }, [fetchApiKeys]);

  // Handle copy to clipboard
  const handleCopy = useCallback(async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied", "Key prefix copied to clipboard");
  }, []);

  // Handle copy full key
  const handleCopyFullKey = useCallback(async () => {
    if (newlyCreatedKey) {
      await Clipboard.setStringAsync(newlyCreatedKey.key);
      Alert.alert("Copied", "Full API key copied to clipboard");
    }
  }, [newlyCreatedKey]);

  // Handle create API key
  const handleCreate = useCallback(
    async (name: string) => {
      setIsCreating(true);
      const result = await createApiKey(name);
      setIsCreating(false);

      if (!result.success) {
        Alert.alert("Error", result.error || "Failed to create API key");
      } else {
        setShowCreateDialog(false);
      }
    },
    [createApiKey],
  );

  // Handle delete API key
  const handleDelete = useCallback(
    async (keyId: string) => {
      const result = await deleteApiKey(keyId);
      if (!result.success) {
        Alert.alert("Error", result.error || "Failed to delete API key");
      }
    },
    [deleteApiKey],
  );

  // Handle close new key dialog
  const handleCloseNewKeyDialog = useCallback(() => {
    clearNewlyCreatedKey();
  }, [clearNewlyCreatedKey]);

  // Loading state
  if (isAuthLoading) {
    return (
      <YStack
        flex={1}
        justifyContent="center"
        alignItems="center"
        backgroundColor="$background"
      >
        <ActivityIndicator size="large" />
      </YStack>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <YStack
        flex={1}
        justifyContent="center"
        padding="$4"
        backgroundColor="$background"
      >
        <Card elevate size="$4" bordered padding="$6" alignItems="center">
          <Ionicons name="lock-closed-outline" size={64} color="#999" />
          <H3 marginTop="$4" textAlign="center">
            Sign in required
          </H3>
          <Paragraph color="$gray11" textAlign="center" marginTop="$2">
            Please sign in to manage your API keys
          </Paragraph>
          <Button
            size="$4"
            theme="active"
            onPress={() => router.push("/(auth)/signin")}
            marginTop="$6"
            width="100%"
          >
            <Text color="white" fontWeight="600">
              Sign In
            </Text>
          </Button>
        </Card>
      </YStack>
    );
  }

  // Render empty state
  const renderEmptyState = () => (
    <Card
      backgroundColor="$gray2"
      padding="$6"
      borderRadius="$4"
      alignItems="center"
    >
      <Ionicons name="key-outline" size={48} color="#999" />
      <H4 marginTop="$4" textAlign="center">
        No API keys yet
      </H4>
      <Paragraph color="$gray11" textAlign="center" marginTop="$2">
        Create an API key to access Spike Land services programmatically
      </Paragraph>
    </Card>
  );

  // Render error state
  const renderErrorState = () => (
    <Card
      backgroundColor="$red2"
      padding="$4"
      borderRadius="$3"
      borderColor="$red7"
      borderWidth={1}
    >
      <XStack space="$2" alignItems="center">
        <Ionicons name="alert-circle" size={20} color="#EF4444" />
        <Text color="$red11" flex={1}>
          {apiKeysError}
        </Text>
      </XStack>
      <Button size="$3" marginTop="$3" onPress={fetchApiKeys}>
        <Text>Retry</Text>
      </Button>
    </Card>
  );

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header */}
      <YStack padding="$4" paddingBottom="$2">
        <XStack alignItems="center" space="$3">
          <Button
            size="$3"
            circular
            chromeless
            onPress={() => router.back()}
            icon={<Ionicons name="arrow-back" size={24} color="#666" />}
          />
          <H3>API Keys</H3>
        </XStack>
        <Paragraph color="$gray11" marginTop="$2" marginLeft="$6">
          Manage your API keys for programmatic access
        </Paragraph>
      </YStack>

      {/* Content */}
      <YStack flex={1} padding="$4" paddingTop="$2">
        {isLoadingApiKeys && !isRefreshing
          ? (
            <YStack flex={1} justifyContent="center" alignItems="center">
              <ActivityIndicator size="large" />
              <Text marginTop="$3" color="$gray11">
                Loading API keys...
              </Text>
            </YStack>
          )
          : apiKeysError
          ? (
            renderErrorState()
          )
          : (
            <FlatList
              data={apiKeys}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ApiKeyItem
                  apiKey={item}
                  onDelete={handleDelete}
                  onCopy={handleCopy}
                />
              )}
              ListEmptyComponent={renderEmptyState}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                />
              }
              contentContainerStyle={{
                flexGrow: 1,
                paddingBottom: 100,
              }}
            />
          )}
      </YStack>

      {/* Create Button */}
      <YStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        padding="$4"
        backgroundColor="$background"
        borderTopWidth={1}
        borderTopColor="$gray5"
      >
        <Button
          size="$5"
          theme="active"
          onPress={() => setShowCreateDialog(true)}
          icon={<Ionicons name="add" size={24} color="white" />}
        >
          <Text color="white" fontWeight="600" fontSize="$4">
            Create API Key
          </Text>
        </Button>
      </YStack>

      {/* Create Dialog */}
      <CreateKeyDialog
        visible={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreate={handleCreate}
        isCreating={isCreating}
      />

      {/* New Key Success Dialog */}
      <NewKeyDialog
        visible={!!newlyCreatedKey}
        fullKey={newlyCreatedKey?.key || ""}
        keyName={newlyCreatedKey?.name || ""}
        onClose={handleCloseNewKeyDialog}
        onCopy={handleCopyFullKey}
      />
    </YStack>
  );
}
