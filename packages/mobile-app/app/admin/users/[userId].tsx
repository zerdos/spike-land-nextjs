/**
 * User Detail Page
 *
 * View and manage individual user: info, tokens, role, enhancement history.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View as RNView,
} from "react-native";
import { Button, Card, H4, Paragraph, Separator, Text, View, XStack, YStack } from "tamagui";
import type { AdminUserDetails, UserRole } from "../../../services/api/admin";
import { adjustUserTokens, deleteUser, getUser, updateUserRole } from "../../../services/api/admin";

// ============================================================================
// Components
// ============================================================================

interface InfoRowProps {
  label: string;
  value: string | null | undefined;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <XStack justifyContent="space-between" paddingVertical="$2">
      <Text fontSize="$3" color="$gray10">
        {label}
      </Text>
      <Text fontSize="$3" color="$gray12" fontWeight="500">
        {value || "N/A"}
      </Text>
    </XStack>
  );
}

interface RoleSelectorProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  isLoading: boolean;
}

function RoleSelector(
  { currentRole, onRoleChange, isLoading }: RoleSelectorProps,
) {
  const roles: UserRole[] = ["USER", "ADMIN", "SUPER_ADMIN"];

  return (
    <XStack flexWrap="wrap" gap="$2">
      {roles.map((role) => (
        <TouchableOpacity
          key={role}
          onPress={() => onRoleChange(role)}
          disabled={isLoading || role === currentRole}
        >
          <View
            backgroundColor={role === currentRole ? "$blue10" : "$gray3"}
            paddingHorizontal="$3"
            paddingVertical="$2"
            borderRadius="$3"
            opacity={isLoading ? 0.5 : 1}
          >
            <Text
              fontSize="$2"
              fontWeight="600"
              color={role === currentRole ? "white" : "$gray11"}
            >
              {role}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </XStack>
  );
}

interface TransactionItemProps {
  transaction: {
    id: string;
    type: string;
    amount: number;
    createdAt: string;
  };
}

function TransactionItem({ transaction }: TransactionItemProps) {
  const isPositive = transaction.amount > 0;

  return (
    <XStack
      justifyContent="space-between"
      alignItems="center"
      paddingVertical="$2"
      borderBottomWidth={1}
      borderBottomColor="$gray4"
    >
      <YStack>
        <Text fontSize="$2" color="$gray11">
          {transaction.type.replace(/_/g, " ")}
        </Text>
        <Text fontSize="$1" color="$gray9">
          {new Date(transaction.createdAt).toLocaleString()}
        </Text>
      </YStack>
      <Text
        fontSize="$3"
        fontWeight="600"
        color={isPositive ? "$green10" : "$red10"}
      >
        {isPositive ? "+" : ""}
        {transaction.amount}
      </Text>
    </XStack>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function UserDetailPage() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string; }>();
  const queryClient = useQueryClient();

  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenAmount, setTokenAmount] = useState("");

  const {
    data: user,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID required");
      const response = await getUser(userId);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data?.user as AdminUserDetails;
    },
    enabled: !!userId,
  });

  const roleMutation = useMutation({
    mutationFn: async (newRole: UserRole) => {
      if (!userId) throw new Error("User ID required");
      const response = await updateUserRole(userId, newRole);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "user", userId] });
      Alert.alert("Success", "User role updated successfully");
    },
    onError: (error) => {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to update role",
      );
    },
  });

  const tokenMutation = useMutation({
    mutationFn: async (amount: number) => {
      if (!userId) throw new Error("User ID required");
      const response = await adjustUserTokens(userId, amount);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "user", userId] });
      setShowTokenModal(false);
      setTokenAmount("");
      Alert.alert("Success", `New balance: ${data?.newBalance} tokens`);
    },
    onError: (error) => {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to adjust tokens",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("User ID required");
      const response = await deleteUser(userId);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      Alert.alert("Success", "User deleted successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (error) => {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to delete user",
      );
    },
  });

  const handleRoleChange = (newRole: UserRole) => {
    Alert.alert(
      "Change Role",
      `Are you sure you want to change this user's role to ${newRole}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", onPress: () => roleMutation.mutate(newRole) },
      ],
    );
  };

  const handleTokenAdjust = () => {
    const amount = parseInt(tokenAmount, 10);
    if (isNaN(amount)) {
      Alert.alert("Error", "Please enter a valid number");
      return;
    }
    if (amount === 0) {
      Alert.alert("Error", "Amount cannot be zero");
      return;
    }
    tokenMutation.mutate(amount);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete User",
      "This will permanently delete the user and ALL their data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Final Confirmation",
              "Type DELETE to confirm (this is permanent)",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "I understand, delete",
                  style: "destructive",
                  onPress: () => deleteMutation.mutate(),
                },
              ],
            );
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Text color="$gray11">Loading user details...</Text>
      </YStack>
    );
  }

  if (error || !user) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text color="$red10" marginBottom="$2">
          Failed to load user
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
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: "#f5f5f5" }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <YStack gap="$4">
          {/* Basic Info */}
          <Card elevate bordered padding="$4" backgroundColor="$background">
            <H4 marginBottom="$3" color="$gray12">
              Basic Information
            </H4>
            <InfoRow label="Name" value={user.name} />
            <InfoRow label="Email" value={user.email} />
            <InfoRow
              label="Joined"
              value={new Date(user.createdAt).toLocaleDateString()}
            />
            <InfoRow
              label="Auth Providers"
              value={user.authProviders?.join(", ") || "None"}
            />
          </Card>

          {/* Role Management */}
          <Card elevate bordered padding="$4" backgroundColor="$background">
            <H4 marginBottom="$3" color="$gray12">
              Role Management
            </H4>
            <Paragraph fontSize="$2" color="$gray10" marginBottom="$3">
              Current role: <Text fontWeight="bold">{user.role}</Text>
            </Paragraph>
            <RoleSelector
              currentRole={user.role}
              onRoleChange={handleRoleChange}
              isLoading={roleMutation.isPending}
            />
          </Card>

          {/* Token Management */}
          <Card elevate bordered padding="$4" backgroundColor="$background">
            <H4 marginBottom="$3" color="$gray12">
              Token Balance
            </H4>
            <XStack justifyContent="space-between" alignItems="center">
              <YStack>
                <Text fontSize="$7" fontWeight="bold" color="$green10">
                  {user.tokenBalance}
                </Text>
                <Text fontSize="$2" color="$gray10">
                  tokens
                </Text>
              </YStack>
              <Button
                size="$3"
                theme="blue"
                onPress={() => setShowTokenModal(true)}
              >
                Adjust Tokens
              </Button>
            </XStack>
          </Card>

          {/* Stats */}
          <Card elevate bordered padding="$4" backgroundColor="$background">
            <H4 marginBottom="$3" color="$gray12">
              Statistics
            </H4>
            <InfoRow
              label="Images Enhanced"
              value={user.imageCount?.toString()}
            />
          </Card>

          {/* Recent Transactions */}
          <Card elevate bordered padding="$4" backgroundColor="$background">
            <H4 marginBottom="$3" color="$gray12">
              Recent Transactions
            </H4>
            {user.recentTransactions?.length === 0
              ? (
                <Text color="$gray10" fontSize="$2">
                  No recent transactions
                </Text>
              )
              : (
                <YStack>
                  {user.recentTransactions?.map((tx) => (
                    <TransactionItem key={tx.id} transaction={tx} />
                  ))}
                </YStack>
              )}
          </Card>

          <Separator />

          {/* Danger Zone */}
          <Card
            elevate
            bordered
            padding="$4"
            backgroundColor="$background"
            borderColor="$red6"
          >
            <H4 marginBottom="$2" color="$red10">
              Danger Zone
            </H4>
            <Paragraph fontSize="$2" color="$gray10" marginBottom="$3">
              Permanently delete this user and all their data. This action cannot be undone.
            </Paragraph>
            <Button
              theme="red"
              onPress={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete User"}
            </Button>
          </Card>
        </YStack>
      </ScrollView>

      {/* Token Adjustment Modal */}
      <Modal
        visible={showTokenModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTokenModal(false)}
      >
        <RNView
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <RNView
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 24,
              width: "100%",
              maxWidth: 400,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                marginBottom: 16,
                color: "#1f2937",
              }}
            >
              Adjust Token Balance
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#6b7280",
                marginBottom: 16,
              }}
            >
              Enter a positive number to add tokens, or negative to subtract.
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: "#d1d5db",
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                marginBottom: 16,
              }}
              placeholder="Amount (e.g., 100 or -50)"
              keyboardType="numeric"
              value={tokenAmount}
              onChangeText={setTokenAmount}
            />
            <RNView style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: "#f3f4f6",
                  alignItems: "center",
                }}
                onPress={() => {
                  setShowTokenModal(false);
                  setTokenAmount("");
                }}
              >
                <Text style={{ color: "#374151", fontWeight: "600" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: "#3b82f6",
                  alignItems: "center",
                  opacity: tokenMutation.isPending ? 0.5 : 1,
                }}
                onPress={handleTokenAdjust}
                disabled={tokenMutation.isPending}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>
                  {tokenMutation.isPending ? "Saving..." : "Confirm"}
                </Text>
              </TouchableOpacity>
            </RNView>
          </RNView>
        </RNView>
      </Modal>
    </>
  );
}
