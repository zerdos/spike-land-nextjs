/**
 * Settings Screen
 * Full settings page with profile editing, API keys, and preferences
 */

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView } from "react-native";
import {
  Avatar,
  Button,
  Card,
  H3,
  H4,
  Input,
  Label,
  Paragraph,
  Separator,
  Switch,
  Text,
  XStack,
  YStack,
} from "tamagui";

import { useAuthStore, useTokenStore } from "../../stores";

// Tab type
type SettingsTab = "profile" | "api-keys" | "preferences" | "privacy";

export default function SettingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: SettingsTab; }>();
  const { user, isAuthenticated, isLoading: isAuthLoading, signOut } = useAuthStore();
  const { balance, isLoading: isTokenLoading } = useTokenStore();

  // Active tab
  const [activeTab, setActiveTab] = useState<SettingsTab>(params.tab || "profile");

  // Profile form state
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [isSaving, setIsSaving] = useState(false);

  // Preferences state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);

  // Privacy state
  const [publicProfile, setPublicProfile] = useState(false);
  const [showActivity, setShowActivity] = useState(true);

  // Update tab from params
  useEffect(() => {
    if (params.tab && ["profile", "api-keys", "preferences", "privacy"].includes(params.tab)) {
      setActiveTab(params.tab);
    }
  }, [params.tab]);

  // Update display name when user changes
  useEffect(() => {
    if (user?.name) {
      setDisplayName(user.name);
    }
  }, [user?.name]);

  // Get user initials
  const getUserInitials = (name?: string | null): string => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle save profile
  const handleSaveProfile = useCallback(async () => {
    if (!displayName.trim()) {
      Alert.alert("Error", "Please enter a display name");
      return;
    }

    setIsSaving(true);
    try {
      // TODO: Implement profile update API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      Alert.alert("Success", "Profile updated successfully");
    } catch {
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  }, [displayName]);

  // Handle sign out
  const handleSignOut = useCallback(() => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await signOut();
            router.replace("/(auth)/signin");
          },
        },
      ],
      { cancelable: true },
    );
  }, [signOut, router]);

  // Handle delete account
  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      "Delete Account",
      "Are you absolutely sure? This action cannot be undone. All your data will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            // TODO: Implement account deletion
            Alert.alert("Info", "Account deletion is not yet implemented");
          },
        },
      ],
      { cancelable: true },
    );
  }, []);

  // Loading state
  if (isAuthLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <ActivityIndicator size="large" />
      </YStack>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return (
      <YStack flex={1} justifyContent="center" padding="$4" backgroundColor="$background">
        <Card elevate size="$4" bordered padding="$6" alignItems="center">
          <Ionicons name="lock-closed-outline" size={64} color="#999" />
          <H3 marginTop="$4" textAlign="center">
            Sign in required
          </H3>
          <Paragraph color="$gray11" textAlign="center" marginTop="$2">
            Please sign in to access your settings
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

  // Tab buttons component
  const TabButton = ({ tab, label }: { tab: SettingsTab; label: string; }) => (
    <Button
      size="$3"
      theme={activeTab === tab ? "active" : undefined}
      backgroundColor={activeTab === tab ? "$blue10" : "$gray3"}
      onPress={() => setActiveTab(tab)}
      flex={1}
    >
      <Text
        color={activeTab === tab ? "white" : "$gray11"}
        fontSize="$2"
        fontWeight={activeTab === tab ? "600" : "400"}
      >
        {label}
      </Text>
    </Button>
  );

  return (
    <ScrollView style={{ flex: 1 }}>
      <YStack padding="$4" backgroundColor="$background" minHeight="100%">
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
            <H3>Settings</H3>
          </XStack>
        </YStack>

        {/* Tab Navigation */}
        <XStack space="$2" marginBottom="$4">
          <TabButton tab="profile" label="Profile" />
          <TabButton tab="api-keys" label="API Keys" />
          <TabButton tab="preferences" label="Prefs" />
          <TabButton tab="privacy" label="Privacy" />
        </XStack>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <YStack space="$4">
            <Card elevate size="$4" bordered>
              <YStack padding="$4" space="$4">
                <H4>Profile Information</H4>
                <Paragraph color="$gray11" fontSize="$2">
                  Your profile information is managed by your OAuth provider
                </Paragraph>

                {/* User avatar and info */}
                <XStack space="$4" alignItems="center">
                  <Avatar circular size="$8">
                    {user.image
                      ? <Avatar.Image source={{ uri: user.image }} />
                      : (
                        <Avatar.Fallback backgroundColor="$blue10">
                          <Text color="white" fontSize="$6" fontWeight="bold">
                            {getUserInitials(user.name)}
                          </Text>
                        </Avatar.Fallback>
                      )}
                  </Avatar>
                  <YStack flex={1}>
                    <Text fontSize="$5" fontWeight="bold">
                      {user.name || "User"}
                    </Text>
                    <Text fontSize="$3" color="$gray11">
                      {user.email}
                    </Text>
                  </YStack>
                </XStack>

                <Separator />

                {/* Display name */}
                <YStack space="$2">
                  <Label htmlFor="displayName" fontSize="$2" color="$gray11">
                    Display Name
                  </Label>
                  <Input
                    id="displayName"
                    size="$4"
                    placeholder="Enter display name"
                    value={displayName}
                    onChangeText={setDisplayName}
                  />
                  <Paragraph color="$gray10" fontSize="$1">
                    This is how your name will be displayed across the platform
                  </Paragraph>
                </YStack>

                {/* Email (read-only) */}
                <YStack space="$2">
                  <Label htmlFor="email" fontSize="$2" color="$gray11">
                    Email
                  </Label>
                  <Input
                    id="email"
                    size="$4"
                    value={user.email || ""}
                    disabled
                    backgroundColor="$gray3"
                  />
                  <Paragraph color="$gray10" fontSize="$1">
                    Email is managed by your OAuth provider and cannot be changed here
                  </Paragraph>
                </YStack>

                <Button
                  size="$4"
                  theme="active"
                  onPress={handleSaveProfile}
                  disabled={isSaving}
                  icon={isSaving ? <ActivityIndicator size="small" color="white" /> : undefined}
                >
                  <Text color="white" fontWeight="600">
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Text>
                </Button>
              </YStack>
            </Card>

            {/* Token Balance */}
            <Card elevate size="$4" bordered>
              <YStack padding="$4" space="$3">
                <H4>Token Balance</H4>
                <XStack justifyContent="space-between" alignItems="center">
                  <XStack space="$2" alignItems="center">
                    <Ionicons name="sparkles" size={24} color="#F59E0B" />
                    <Text fontSize="$4">Available Tokens</Text>
                  </XStack>
                  {isTokenLoading
                    ? <ActivityIndicator size="small" />
                    : (
                      <Text fontSize="$5" fontWeight="bold" color="$blue10">
                        {balance?.toLocaleString() ?? 0}
                      </Text>
                    )}
                </XStack>
                <Button size="$3" chromeless alignSelf="flex-start">
                  <Text color="$blue10">Purchase more tokens</Text>
                </Button>
              </YStack>
            </Card>
          </YStack>
        )}

        {/* API Keys Tab */}
        {activeTab === "api-keys" && (
          <YStack space="$4">
            <Card elevate size="$4" bordered>
              <YStack padding="$4" space="$4">
                <H4>API Keys</H4>
                <Paragraph color="$gray11" fontSize="$2">
                  Manage your API keys for external integrations
                </Paragraph>

                {/* Placeholder for API keys list */}
                <Card backgroundColor="$gray2" padding="$4" borderRadius="$3">
                  <YStack alignItems="center" space="$2">
                    <Ionicons name="key-outline" size={40} color="#999" />
                    <Text color="$gray11" textAlign="center">
                      No API keys created yet
                    </Text>
                    <Text color="$gray10" fontSize="$2" textAlign="center">
                      API keys allow you to access Spike Land services programmatically
                    </Text>
                  </YStack>
                </Card>

                <Button
                  size="$4"
                  theme="active"
                  icon={<Ionicons name="add" size={20} color="white" />}
                >
                  <Text color="white" fontWeight="600">
                    Create API Key
                  </Text>
                </Button>
              </YStack>
            </Card>
          </YStack>
        )}

        {/* Preferences Tab */}
        {activeTab === "preferences" && (
          <YStack space="$4">
            <Card elevate size="$4" bordered>
              <YStack padding="$4" space="$4">
                <H4>Account Preferences</H4>
                <Paragraph color="$gray11" fontSize="$2">
                  Customize how you want to interact with Spike Land
                </Paragraph>

                {/* Email notifications */}
                <XStack justifyContent="space-between" alignItems="center">
                  <YStack flex={1} marginRight="$4">
                    <Text fontSize="$4">Email Notifications</Text>
                    <Paragraph color="$gray10" fontSize="$2">
                      Receive email updates about your account activity
                    </Paragraph>
                  </YStack>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </XStack>

                <Separator />

                {/* Push notifications */}
                <XStack justifyContent="space-between" alignItems="center">
                  <YStack flex={1} marginRight="$4">
                    <Text fontSize="$4">Push Notifications</Text>
                    <Paragraph color="$gray10" fontSize="$2">
                      Get push notifications for important updates
                    </Paragraph>
                  </YStack>
                  <Switch
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                  />
                </XStack>
              </YStack>
            </Card>
          </YStack>
        )}

        {/* Privacy Tab */}
        {activeTab === "privacy" && (
          <YStack space="$4">
            <Card elevate size="$4" bordered>
              <YStack padding="$4" space="$4">
                <H4>Privacy Settings</H4>
                <Paragraph color="$gray11" fontSize="$2">
                  Control how others can see and interact with your profile
                </Paragraph>

                {/* Public profile */}
                <XStack justifyContent="space-between" alignItems="center">
                  <YStack flex={1} marginRight="$4">
                    <Text fontSize="$4">Public Profile</Text>
                    <Paragraph color="$gray10" fontSize="$2">
                      Make your profile visible to other users
                    </Paragraph>
                  </YStack>
                  <Switch checked={publicProfile} onCheckedChange={setPublicProfile} />
                </XStack>

                <Separator />

                {/* Show activity */}
                <XStack justifyContent="space-between" alignItems="center">
                  <YStack flex={1} marginRight="$4">
                    <Text fontSize="$4">Show Activity Status</Text>
                    <Paragraph color="$gray10" fontSize="$2">
                      Let others see when you're online
                    </Paragraph>
                  </YStack>
                  <Switch checked={showActivity} onCheckedChange={setShowActivity} />
                </XStack>
              </YStack>
            </Card>

            {/* Danger Zone */}
            <Card elevate size="$4" bordered borderColor="$red7">
              <YStack padding="$4" space="$4">
                <H4 color="$red10">Danger Zone</H4>
                <Paragraph color="$gray11" fontSize="$2">
                  Permanently delete your account and all associated data
                </Paragraph>

                <Button
                  size="$4"
                  backgroundColor="$red10"
                  onPress={handleDeleteAccount}
                  icon={<Ionicons name="trash-outline" size={20} color="white" />}
                >
                  <Text color="white" fontWeight="600">
                    Delete Account
                  </Text>
                </Button>
              </YStack>
            </Card>
          </YStack>
        )}

        {/* Sign Out */}
        <Card elevate size="$4" bordered marginTop="$4">
          <Button size="$4" chromeless onPress={handleSignOut}>
            <XStack space="$2" alignItems="center">
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text color="$red10" fontWeight="500">
                Sign Out
              </Text>
            </XStack>
          </Button>
        </Card>

        {/* App version */}
        <YStack alignItems="center" padding="$4">
          <Text color="$gray10" fontSize="$2">
            Spike Land v1.0.0
          </Text>
        </YStack>
      </YStack>
    </ScrollView>
  );
}
