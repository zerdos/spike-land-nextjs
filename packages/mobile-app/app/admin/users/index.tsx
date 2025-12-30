/**
 * User Management Page
 *
 * Search users, view list with filters, and manage roles.
 */

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  View as RNView,
} from "react-native";
import { Card, Text, View, XStack, YStack } from "tamagui";
import { AdminUser, getUsers, UserRole } from "../../../services/api/admin";

// ============================================================================
// Components
// ============================================================================

interface RoleBadgeProps {
  role: UserRole;
}

function RoleBadge({ role }: RoleBadgeProps) {
  const getColors = () => {
    switch (role) {
      case "SUPER_ADMIN":
        return { bg: "$purple3", text: "$purple11" };
      case "ADMIN":
        return { bg: "$blue3", text: "$blue11" };
      default:
        return { bg: "$gray3", text: "$gray11" };
    }
  };

  const colors = getColors();

  return (
    <View
      backgroundColor={colors.bg}
      paddingHorizontal="$2"
      paddingVertical="$1"
      borderRadius="$2"
    >
      <Text fontSize="$1" fontWeight="600" color={colors.text}>
        {role}
      </Text>
    </View>
  );
}

interface UserCardProps {
  user: AdminUser;
  onPress: () => void;
}

function UserCard({ user, onPress }: UserCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card
        elevate
        bordered
        padding="$4"
        marginBottom="$3"
        backgroundColor="$background"
      >
        <YStack gap="$2">
          <XStack justifyContent="space-between" alignItems="flex-start">
            <YStack flex={1} marginRight="$2">
              <Text
                fontSize="$4"
                fontWeight="600"
                color="$gray12"
                numberOfLines={1}
              >
                {user.name || "No name"}
              </Text>
              <Text fontSize="$2" color="$gray10" numberOfLines={1}>
                {user.email || "No email"}
              </Text>
            </YStack>
            <RoleBadge role={user.role} />
          </XStack>

          <XStack gap="$3" marginTop="$1">
            <View
              backgroundColor="$green3"
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$2"
            >
              <Text fontSize="$1" color="$green11" fontWeight="500">
                {user.tokenBalance} tokens
              </Text>
            </View>
            <View
              backgroundColor="$gray3"
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$2"
            >
              <Text fontSize="$1" color="$gray11" fontWeight="500">
                {user.imageCount} images
              </Text>
            </View>
          </XStack>

          <Text fontSize="$1" color="$gray9" marginTop="$1">
            Joined: {new Date(user.createdAt).toLocaleDateString()}
          </Text>
        </YStack>
      </Card>
    </TouchableOpacity>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function UserManagementPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    // Simple debounce with setTimeout
    setTimeout(() => {
      setDebouncedSearch(text);
    }, 500);
  };

  const {
    data: users,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["admin", "users", debouncedSearch],
    queryFn: async () => {
      const response = await getUsers(debouncedSearch || undefined);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data?.users || [];
    },
  });

  const handleUserPress = (userId: string) => {
    router.push(`/admin/users/${userId}`);
  };

  const renderEmptyState = () => (
    <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
      <Text fontSize="$5" color="$gray9" marginBottom="$2">
        No users found
      </Text>
      <Text fontSize="$2" color="$gray8" textAlign="center">
        {searchQuery
          ? "Try adjusting your search query"
          : "No users in the system yet"}
      </Text>
    </YStack>
  );

  const renderHeader = () => (
    <YStack padding="$4" paddingBottom="$2">
      <RNView
        style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          marginBottom: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2,
        }}
      >
        <TextInput
          placeholder="Search by email or name..."
          value={searchQuery}
          onChangeText={handleSearch}
          style={{
            fontSize: 16,
            color: "#1f2937",
          }}
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </RNView>

      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$2" color="$gray10">
          {users?.length || 0} users found
        </Text>
        {isRefetching && (
          <Text fontSize="$1" color="$blue10">
            Refreshing...
          </Text>
        )}
      </XStack>
    </YStack>
  );

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Text color="$gray11">Loading users...</Text>
      </YStack>
    );
  }

  if (error) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text color="$red10" marginBottom="$2">
          Failed to load users
        </Text>
        <Text color="$gray10" fontSize="$2" textAlign="center">
          {error instanceof Error ? error.message : "Unknown error"}
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
        >
          <Text color="$blue10" marginTop="$4">
            Try Again
          </Text>
        </TouchableOpacity>
      </YStack>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: "#f5f5f5" }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
      data={users || []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <UserCard
          user={item}
          onPress={() => handleUserPress(item.id)}
        />
      )}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmptyState}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    />
  );
}
