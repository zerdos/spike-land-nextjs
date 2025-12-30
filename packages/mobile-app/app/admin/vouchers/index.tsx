/**
 * Voucher Management Page
 *
 * View vouchers, create new ones, and manage their status.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  View as RNView,
} from "react-native";
import { Card, H4, Text, View, XStack, YStack } from "tamagui";
import {
  createVoucher,
  CreateVoucherRequest,
  deleteVoucher,
  getVouchers,
  updateVoucherStatus,
  Voucher,
  VoucherStatus,
  VoucherType,
} from "../../../services/api/admin";

// ============================================================================
// Components
// ============================================================================

interface StatusBadgeProps {
  status: VoucherStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const getColors = () => {
    switch (status) {
      case "ACTIVE":
        return { bg: "$green3", text: "$green11" };
      case "USED":
        return { bg: "$blue3", text: "$blue11" };
      case "EXPIRED":
        return { bg: "$orange3", text: "$orange11" };
      case "DISABLED":
        return { bg: "$gray5", text: "$gray11" };
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
        {status}
      </Text>
    </View>
  );
}

interface VoucherCardProps {
  voucher: Voucher;
  onToggleStatus: (voucher: Voucher) => void;
  onDelete: (voucher: Voucher) => void;
  isUpdating: boolean;
}

function VoucherCard({
  voucher,
  onToggleStatus,
  onDelete,
  isUpdating,
}: VoucherCardProps) {
  return (
    <Card
      elevate
      bordered
      padding="$4"
      marginBottom="$3"
      backgroundColor="$background"
    >
      <YStack gap="$2">
        {/* Header */}
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack flex={1}>
            <Text
              fontSize="$5"
              fontWeight="bold"
              color="$gray12"
              fontFamily="monospace"
            >
              {voucher.code}
            </Text>
            <Text fontSize="$2" color="$gray10" marginTop="$1">
              {voucher.type === "FIXED"
                ? `${voucher.value} tokens`
                : `${voucher.value}% discount`}
            </Text>
          </YStack>
          <StatusBadge status={voucher.status} />
        </XStack>

        {/* Stats */}
        <XStack flexWrap="wrap" gap="$2" marginTop="$2">
          <View
            backgroundColor="$gray3"
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$2"
          >
            <Text fontSize="$1" color="$gray11">
              Used: {voucher.currentUses}
              {voucher.maxUses ? ` / ${voucher.maxUses}` : ""}
            </Text>
          </View>
          {voucher.expiresAt && (
            <View
              backgroundColor="$orange3"
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$2"
            >
              <Text fontSize="$1" color="$orange11">
                Expires: {new Date(voucher.expiresAt).toLocaleDateString()}
              </Text>
            </View>
          )}
          <View
            backgroundColor="$purple3"
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$2"
          >
            <Text fontSize="$1" color="$purple11">
              {voucher.redemptions} redemptions
            </Text>
          </View>
        </XStack>

        {/* Actions */}
        <XStack justifyContent="flex-end" gap="$2" marginTop="$2">
          {voucher.status === "ACTIVE" && (
            <TouchableOpacity
              onPress={() => onToggleStatus(voucher)}
              disabled={isUpdating}
            >
              <View
                backgroundColor="$gray3"
                paddingHorizontal="$3"
                paddingVertical="$2"
                borderRadius="$2"
                opacity={isUpdating ? 0.5 : 1}
              >
                <Text fontSize="$2" color="$gray11" fontWeight="500">
                  Disable
                </Text>
              </View>
            </TouchableOpacity>
          )}
          {voucher.status === "DISABLED" && (
            <TouchableOpacity
              onPress={() => onToggleStatus(voucher)}
              disabled={isUpdating}
            >
              <View
                backgroundColor="$green3"
                paddingHorizontal="$3"
                paddingVertical="$2"
                borderRadius="$2"
                opacity={isUpdating ? 0.5 : 1}
              >
                <Text fontSize="$2" color="$green11" fontWeight="500">
                  Enable
                </Text>
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => onDelete(voucher)}
            disabled={isUpdating}
          >
            <View
              backgroundColor="$red3"
              paddingHorizontal="$3"
              paddingVertical="$2"
              borderRadius="$2"
              opacity={isUpdating ? 0.5 : 1}
            >
              <Text fontSize="$2" color="$red11" fontWeight="500">
                Delete
              </Text>
            </View>
          </TouchableOpacity>
        </XStack>

        {/* Created date */}
        <Text fontSize="$1" color="$gray9" marginTop="$1">
          Created: {new Date(voucher.createdAt).toLocaleDateString()}
        </Text>
      </YStack>
    </Card>
  );
}

interface CreateVoucherModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (data: CreateVoucherRequest) => void;
  isCreating: boolean;
}

function CreateVoucherModal({
  visible,
  onClose,
  onCreate,
  isCreating,
}: CreateVoucherModalProps) {
  const [code, setCode] = useState("");
  const [type, setType] = useState<VoucherType>("FIXED");
  const [value, setValue] = useState("");
  const [maxUses, setMaxUses] = useState("");

  const handleCreate = () => {
    if (!code.trim()) {
      Alert.alert("Error", "Please enter a voucher code");
      return;
    }
    if (!value || isNaN(parseInt(value, 10))) {
      Alert.alert("Error", "Please enter a valid value");
      return;
    }

    onCreate({
      code: code.trim().toUpperCase(),
      type,
      value: parseInt(value, 10),
      maxUses: maxUses ? parseInt(maxUses, 10) : null,
    });
  };

  const resetForm = () => {
    setCode("");
    setType("FIXED");
    setValue("");
    setMaxUses("");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
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
            Create Voucher
          </Text>

          {/* Code Input */}
          <Text
            style={{
              fontSize: 14,
              color: "#6b7280",
              marginBottom: 8,
            }}
          >
            Voucher Code
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: "#d1d5db",
              borderRadius: 8,
              padding: 12,
              fontSize: 16,
              marginBottom: 16,
              textTransform: "uppercase",
            }}
            placeholder="e.g., WELCOME50"
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
          />

          {/* Type Selector */}
          <Text
            style={{
              fontSize: 14,
              color: "#6b7280",
              marginBottom: 8,
            }}
          >
            Type
          </Text>
          <RNView style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => setType("FIXED")}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 8,
                backgroundColor: type === "FIXED" ? "#3b82f6" : "#f3f4f6",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: type === "FIXED" ? "#fff" : "#374151",
                  fontWeight: "600",
                }}
              >
                Fixed Tokens
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setType("PERCENTAGE")}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 8,
                backgroundColor: type === "PERCENTAGE" ? "#3b82f6" : "#f3f4f6",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: type === "PERCENTAGE" ? "#fff" : "#374151",
                  fontWeight: "600",
                }}
              >
                Percentage
              </Text>
            </TouchableOpacity>
          </RNView>

          {/* Value Input */}
          <Text
            style={{
              fontSize: 14,
              color: "#6b7280",
              marginBottom: 8,
            }}
          >
            Value ({type === "FIXED" ? "tokens" : "percent"})
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
            placeholder={type === "FIXED" ? "e.g., 100" : "e.g., 20"}
            keyboardType="numeric"
            value={value}
            onChangeText={setValue}
          />

          {/* Max Uses Input */}
          <Text
            style={{
              fontSize: 14,
              color: "#6b7280",
              marginBottom: 8,
            }}
          >
            Max Uses (optional)
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: "#d1d5db",
              borderRadius: 8,
              padding: 12,
              fontSize: 16,
              marginBottom: 24,
            }}
            placeholder="Leave empty for unlimited"
            keyboardType="numeric"
            value={maxUses}
            onChangeText={setMaxUses}
          />

          {/* Actions */}
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
                resetForm();
                onClose();
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
                opacity: isCreating ? 0.5 : 1,
              }}
              onPress={handleCreate}
              disabled={isCreating}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>
                {isCreating ? "Creating..." : "Create"}
              </Text>
            </TouchableOpacity>
          </RNView>
        </RNView>
      </RNView>
    </Modal>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function VoucherManagementPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [updatingVoucherId, setUpdatingVoucherId] = useState<string | null>(
    null,
  );

  const {
    data: vouchers,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["admin", "vouchers"],
    queryFn: async () => {
      const response = await getVouchers();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data?.vouchers || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateVoucherRequest) => {
      const response = await createVoucher(data);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "vouchers"] });
      setShowCreateModal(false);
      Alert.alert("Success", "Voucher created successfully");
    },
    onError: (error) => {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to create voucher",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: VoucherStatus;
    }) => {
      setUpdatingVoucherId(id);
      const response = await updateVoucherStatus(id, status);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      setUpdatingVoucherId(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "vouchers"] });
      Alert.alert("Success", "Voucher status updated");
    },
    onError: (error) => {
      setUpdatingVoucherId(null);
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to update voucher",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      setUpdatingVoucherId(id);
      const response = await deleteVoucher(id);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      setUpdatingVoucherId(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "vouchers"] });
      Alert.alert("Success", "Voucher deleted");
    },
    onError: (error) => {
      setUpdatingVoucherId(null);
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to delete voucher",
      );
    },
  });

  const handleToggleStatus = (voucher: Voucher) => {
    const newStatus: VoucherStatus = voucher.status === "ACTIVE"
      ? "DISABLED"
      : "ACTIVE";
    Alert.alert(
      "Change Status",
      `Are you sure you want to ${
        voucher.status === "ACTIVE" ? "disable" : "enable"
      } this voucher?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => updateMutation.mutate({ id: voucher.id, status: newStatus }),
        },
      ],
    );
  };

  const handleDelete = (voucher: Voucher) => {
    Alert.alert(
      "Delete Voucher",
      `Are you sure you want to delete voucher "${voucher.code}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(voucher.id),
        },
      ],
    );
  };

  const renderHeader = () => (
    <YStack paddingVertical="$3">
      <XStack
        justifyContent="space-between"
        alignItems="center"
        marginBottom="$4"
      >
        <H4 color="$gray12">Vouchers</H4>
        <TouchableOpacity onPress={() => setShowCreateModal(true)}>
          <View
            backgroundColor="$blue10"
            paddingHorizontal="$4"
            paddingVertical="$2"
            borderRadius="$3"
          >
            <Text fontSize="$3" fontWeight="600" color="white">
              + Create
            </Text>
          </View>
        </TouchableOpacity>
      </XStack>

      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$2" color="$gray10">
          {vouchers?.length || 0} vouchers
        </Text>
        {isRefetching && (
          <Text fontSize="$1" color="$blue10">
            Refreshing...
          </Text>
        )}
      </XStack>
    </YStack>
  );

  const renderEmptyState = () => (
    <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
      <Text fontSize="$5" color="$gray9" marginBottom="$2">
        No vouchers
      </Text>
      <Text fontSize="$2" color="$gray8" textAlign="center">
        Create your first voucher to get started
      </Text>
    </YStack>
  );

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Text color="$gray11">Loading vouchers...</Text>
      </YStack>
    );
  }

  if (error) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text color="$red10" marginBottom="$2">
          Failed to load vouchers
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
      <FlatList
        style={{ flex: 1, backgroundColor: "#f5f5f5" }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        data={vouchers || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <VoucherCard
            voucher={item}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDelete}
            isUpdating={updatingVoucherId === item.id}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      />

      <CreateVoucherModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={(data) => createMutation.mutate(data)}
        isCreating={createMutation.isPending}
      />
    </>
  );
}
