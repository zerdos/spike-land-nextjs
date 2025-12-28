/**
 * Privacy Settings Screen
 * Manage profile visibility and account deletion
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert } from "react-native";
import {
  Button,
  Card,
  Dialog,
  H3,
  H4,
  Input,
  Paragraph,
  ScrollView,
  Separator,
  Switch,
  Text,
  XStack,
  YStack,
} from "tamagui";

import { useAuthStore } from "../../stores";
import { useSettingsStore } from "../../stores/settings-store";

// ============================================================================
// Types
// ============================================================================

interface PrivacyToggleProps {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

// ============================================================================
// Components
// ============================================================================

function PrivacyToggle({
  title,
  description,
  value,
  onValueChange,
  disabled = false,
}: PrivacyToggleProps) {
  return (
    <XStack justifyContent="space-between" alignItems="center">
      <YStack flex={1} marginRight="$4">
        <Text fontSize="$4" fontWeight="500">
          {title}
        </Text>
        <Paragraph color="$gray10" fontSize="$2" marginTop="$1">
          {description}
        </Paragraph>
      </YStack>
      <Switch
        checked={value}
        onCheckedChange={onValueChange}
        disabled={disabled}
      />
    </XStack>
  );
}

function DeleteAccountDialog({
  visible,
  onClose,
  onConfirm,
  isDeleting,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  const [confirmText, setConfirmText] = useState("");
  const CONFIRM_PHRASE = "DELETE";

  const handleClose = useCallback(() => {
    setConfirmText("");
    onClose();
  }, [onClose]);

  const handleConfirm = useCallback(() => {
    if (confirmText === CONFIRM_PHRASE) {
      onConfirm();
    }
  }, [confirmText, onConfirm]);

  const isConfirmEnabled = confirmText === CONFIRM_PHRASE && !isDeleting;

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
          <Dialog.Title>
            <XStack space="$2" alignItems="center">
              <Ionicons name="warning" size={24} color="#EF4444" />
              <Text fontSize="$5" fontWeight="600" color="$red10">
                Delete Account
              </Text>
            </XStack>
          </Dialog.Title>

          <Dialog.Description>
            <YStack space="$4">
              <Card
                backgroundColor="$red2"
                padding="$3"
                borderRadius="$3"
                borderColor="$red7"
                borderWidth={1}
              >
                <YStack space="$2">
                  <Text color="$red11" fontWeight="600">
                    This action is permanent and cannot be undone.
                  </Text>
                  <Text color="$red11" fontSize="$2">
                    All your data will be permanently deleted, including:
                  </Text>
                  <YStack space="$1" marginLeft="$2">
                    <Text color="$red11" fontSize="$2">
                      - All enhanced images
                    </Text>
                    <Text color="$red11" fontSize="$2">
                      - Your token balance
                    </Text>
                    <Text color="$red11" fontSize="$2">
                      - API keys and integrations
                    </Text>
                    <Text color="$red11" fontSize="$2">
                      - Purchase history
                    </Text>
                  </YStack>
                </YStack>
              </Card>

              <YStack space="$2">
                <Text fontSize="$3">
                  To confirm, type <Text fontWeight="bold">{CONFIRM_PHRASE}</Text> below:
                </Text>
                <Input
                  size="$4"
                  placeholder={`Type ${CONFIRM_PHRASE} to confirm`}
                  value={confirmText}
                  onChangeText={setConfirmText}
                  testID="delete-confirm-input"
                  autoCapitalize="characters"
                />
              </YStack>
            </YStack>
          </Dialog.Description>

          <XStack space="$3" justifyContent="flex-end">
            <Button size="$4" onPress={handleClose} disabled={isDeleting}>
              <Text>Cancel</Text>
            </Button>
            <Button
              size="$4"
              backgroundColor="$red10"
              onPress={handleConfirm}
              disabled={!isConfirmEnabled}
            >
              {isDeleting
                ? (
                  <XStack space="$2" alignItems="center">
                    <ActivityIndicator size="small" color="white" />
                    <Text color="white" fontWeight="600">
                      Deleting...
                    </Text>
                  </XStack>
                )
                : (
                  <Text color="white" fontWeight="600">
                    Delete My Account
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

export default function PrivacyScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading, signOut } = useAuthStore();
  const {
    privacy,
    isSavingPreferences,
    preferencesError,
    isDeletingAccount,
    deleteAccountError,
    updatePrivacyPreference,
    deleteAccount,
    initialize,
  } = useSettingsStore();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Initialize settings on mount
  useEffect(() => {
    if (isAuthenticated) {
      initialize();
    }
  }, [isAuthenticated, initialize]);

  // Handle toggle changes
  const handlePublicProfileChange = useCallback(
    async (value: boolean) => {
      await updatePrivacyPreference("publicProfile", value);
    },
    [updatePrivacyPreference],
  );

  const handleShowActivityChange = useCallback(
    async (value: boolean) => {
      await updatePrivacyPreference("showActivity", value);
    },
    [updatePrivacyPreference],
  );

  // Handle delete account
  const handleDeleteAccount = useCallback(async () => {
    const result = await deleteAccount();

    if (result.success) {
      setShowDeleteDialog(false);
      await signOut();
      router.replace("/(auth)/signin");
    } else {
      Alert.alert(
        "Error",
        result.error || "Failed to delete account. Please try again.",
      );
    }
  }, [deleteAccount, signOut, router]);

  // Show error alert
  useEffect(() => {
    if (preferencesError) {
      Alert.alert("Error", preferencesError);
    }
  }, [preferencesError]);

  useEffect(() => {
    if (deleteAccountError) {
      Alert.alert("Error", deleteAccountError);
    }
  }, [deleteAccountError]);

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
            Please sign in to manage your privacy settings
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

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
      <YStack flex={1} padding="$4" backgroundColor="$background">
        {/* Header */}
        <YStack marginBottom="$4">
          <XStack alignItems="center" space="$3">
            <Button
              size="$3"
              circular
              chromeless
              onPress={() => router.back()}
              icon={<Ionicons name="arrow-back" size={24} color="#666" />}
            />
            <H3>Privacy</H3>
          </XStack>
          <Paragraph color="$gray11" marginTop="$2" marginLeft="$6">
            Control how others can see and interact with your profile
          </Paragraph>
        </YStack>

        {/* Profile Visibility */}
        <Card elevate size="$4" bordered marginBottom="$4">
          <YStack padding="$4" space="$4">
            <H4>Profile Visibility</H4>

            <PrivacyToggle
              title="Public Profile"
              description="When enabled, your profile can be viewed by other users. Your name and public gallery will be visible."
              value={privacy.publicProfile}
              onValueChange={handlePublicProfileChange}
              disabled={isSavingPreferences}
            />

            <Separator />

            <PrivacyToggle
              title="Show Activity Status"
              description="Let others see when you're online and your recent activity on the platform."
              value={privacy.showActivity}
              onValueChange={handleShowActivityChange}
              disabled={isSavingPreferences}
            />
          </YStack>
        </Card>

        {/* Data Privacy Info */}
        <Card elevate size="$4" bordered marginBottom="$4">
          <YStack padding="$4" space="$3">
            <H4>Your Data</H4>
            <Paragraph color="$gray11" fontSize="$2">
              We take your privacy seriously. Your images and personal data are stored securely and
              are never shared with third parties without your consent.
            </Paragraph>

            <XStack space="$2" alignItems="flex-start">
              <Ionicons name="shield-checkmark" size={20} color="#22C55E" />
              <YStack flex={1}>
                <Text fontSize="$3" fontWeight="500">
                  End-to-end encryption
                </Text>
                <Text fontSize="$2" color="$gray10">
                  Your images are encrypted during upload and storage
                </Text>
              </YStack>
            </XStack>

            <XStack space="$2" alignItems="flex-start">
              <Ionicons name="lock-closed" size={20} color="#22C55E" />
              <YStack flex={1}>
                <Text fontSize="$3" fontWeight="500">
                  Secure storage
                </Text>
                <Text fontSize="$2" color="$gray10">
                  Data is stored in SOC 2 compliant data centers
                </Text>
              </YStack>
            </XStack>

            <XStack space="$2" alignItems="flex-start">
              <Ionicons name="trash" size={20} color="#22C55E" />
              <YStack flex={1}>
                <Text fontSize="$3" fontWeight="500">
                  Right to delete
                </Text>
                <Text fontSize="$2" color="$gray10">
                  You can delete your account and all data at any time
                </Text>
              </YStack>
            </XStack>
          </YStack>
        </Card>

        {/* Danger Zone */}
        <Card elevate size="$4" bordered borderColor="$red7">
          <YStack padding="$4" space="$4">
            <XStack space="$2" alignItems="center">
              <Ionicons name="warning" size={24} color="#EF4444" />
              <H4 color="$red10">Danger Zone</H4>
            </XStack>

            <Paragraph color="$gray11" fontSize="$2">
              Once you delete your account, there is no going back. Please be certain.
            </Paragraph>

            <Button
              size="$4"
              backgroundColor="$red10"
              onPress={() => setShowDeleteDialog(true)}
              icon={<Ionicons name="trash-outline" size={20} color="white" />}
            >
              <Text color="white" fontWeight="600">
                Delete Account
              </Text>
            </Button>
          </YStack>
        </Card>

        {/* Saving indicator */}
        {isSavingPreferences && (
          <XStack
            position="absolute"
            top="$4"
            right="$4"
            space="$2"
            alignItems="center"
            backgroundColor="$background"
            padding="$2"
            borderRadius="$2"
          >
            <ActivityIndicator size="small" />
            <Text fontSize="$2" color="$gray11">
              Saving...
            </Text>
          </XStack>
        )}

        {/* Delete Account Dialog */}
        <DeleteAccountDialog
          visible={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleDeleteAccount}
          isDeleting={isDeletingAccount}
        />
      </YStack>
    </ScrollView>
  );
}
