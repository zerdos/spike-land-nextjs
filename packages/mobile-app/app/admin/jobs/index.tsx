/**
 * Job Queue Page
 *
 * View and manage enhancement jobs with status filters and retry functionality.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, FlatList, RefreshControl, TouchableOpacity } from "react-native";
import { Card, H4, Text, View, XStack, YStack } from "tamagui";
import { getJobs, JobSource, JobStatus, retryJob, UnifiedJob } from "../../../services/api/admin";

// ============================================================================
// Components
// ============================================================================

interface StatusFilterProps {
  selected: JobStatus | null;
  onSelect: (status: JobStatus | null) => void;
  counts: Record<string, number>;
}

function StatusFilter({ selected, onSelect, counts }: StatusFilterProps) {
  const statuses: Array<{ key: JobStatus | null; label: string; }> = [
    { key: null, label: "All" },
    { key: "PENDING", label: "Pending" },
    { key: "PROCESSING", label: "Processing" },
    { key: "COMPLETED", label: "Completed" },
    { key: "FAILED", label: "Failed" },
  ];

  return (
    <XStack flexWrap="wrap" gap="$2" marginBottom="$3">
      {statuses.map(({ key, label }) => (
        <TouchableOpacity
          key={key ?? "all"}
          onPress={() => onSelect(key)}
        >
          <View
            backgroundColor={selected === key ? "$blue10" : "$gray3"}
            paddingHorizontal="$3"
            paddingVertical="$2"
            borderRadius="$3"
          >
            <XStack alignItems="center" gap="$1">
              <Text
                fontSize="$2"
                fontWeight="600"
                color={selected === key ? "white" : "$gray11"}
              >
                {label}
              </Text>
              <Text
                fontSize="$1"
                color={selected === key ? "white" : "$gray9"}
              >
                ({counts[key ?? "ALL"] || 0})
              </Text>
            </XStack>
          </View>
        </TouchableOpacity>
      ))}
    </XStack>
  );
}

interface TypeFilterProps {
  selected: JobSource | "all";
  onSelect: (type: JobSource | "all") => void;
  counts: { all: number; enhancement: number; mcp: number; };
}

function TypeFilter({ selected, onSelect, counts }: TypeFilterProps) {
  const types: Array<{ key: JobSource | "all"; label: string; }> = [
    { key: "all", label: "All" },
    { key: "enhancement", label: "Enhancement" },
    { key: "mcp", label: "MCP" },
  ];

  return (
    <XStack gap="$2" marginBottom="$4">
      {types.map(({ key, label }) => (
        <TouchableOpacity key={key} onPress={() => onSelect(key)}>
          <View
            backgroundColor={selected === key ? "$purple10" : "$gray3"}
            paddingHorizontal="$3"
            paddingVertical="$1"
            borderRadius="$2"
          >
            <Text
              fontSize="$1"
              fontWeight="500"
              color={selected === key ? "white" : "$gray11"}
            >
              {label} ({counts[key]})
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </XStack>
  );
}

interface JobStatusBadgeProps {
  status: JobStatus;
}

function JobStatusBadge({ status }: JobStatusBadgeProps) {
  const getColors = () => {
    switch (status) {
      case "PENDING":
        return { bg: "$yellow3", text: "$yellow11" };
      case "PROCESSING":
        return { bg: "$blue3", text: "$blue11" };
      case "COMPLETED":
        return { bg: "$green3", text: "$green11" };
      case "FAILED":
        return { bg: "$red3", text: "$red11" };
      case "REFUNDED":
        return { bg: "$orange3", text: "$orange11" };
      case "CANCELLED":
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

interface SourceBadgeProps {
  source: JobSource;
}

function SourceBadge({ source }: SourceBadgeProps) {
  return (
    <View
      backgroundColor={source === "enhancement" ? "$purple3" : "$cyan3"}
      paddingHorizontal="$2"
      paddingVertical="$1"
      borderRadius="$2"
    >
      <Text
        fontSize="$1"
        fontWeight="500"
        color={source === "enhancement" ? "$purple11" : "$cyan11"}
      >
        {source.toUpperCase()}
      </Text>
    </View>
  );
}

interface JobCardProps {
  job: UnifiedJob;
  onRetry: (jobId: string) => void;
  isRetrying: boolean;
}

function JobCard({ job, onRetry, isRetrying }: JobCardProps) {
  const canRetry = job.status === "FAILED";

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
            <Text fontSize="$1" color="$gray9" numberOfLines={1}>
              {job.id.slice(0, 16)}...
            </Text>
            <Text fontSize="$3" color="$gray11" numberOfLines={1} marginTop="$1">
              {job.userEmail || "Unknown user"}
            </Text>
          </YStack>
          <XStack gap="$2">
            <SourceBadge source={job.source} />
            <JobStatusBadge status={job.status} />
          </XStack>
        </XStack>

        {/* Details */}
        <XStack flexWrap="wrap" gap="$3" marginTop="$1">
          <View
            backgroundColor="$gray3"
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$2"
          >
            <Text fontSize="$1" color="$gray11">
              {job.tier}
            </Text>
          </View>
          <View
            backgroundColor="$green3"
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$2"
          >
            <Text fontSize="$1" color="$green11">
              {job.tokensCost} tokens
            </Text>
          </View>
        </XStack>

        {/* Prompt preview */}
        {job.prompt && (
          <Text fontSize="$2" color="$gray10" numberOfLines={2} marginTop="$1">
            {job.prompt}
          </Text>
        )}

        {/* Error message for failed jobs */}
        {job.status === "FAILED" && job.errorMessage && (
          <View
            backgroundColor="$red3"
            padding="$2"
            borderRadius="$2"
            marginTop="$1"
          >
            <Text fontSize="$1" color="$red11" numberOfLines={2}>
              {job.errorMessage}
            </Text>
          </View>
        )}

        {/* Timestamps and actions */}
        <XStack justifyContent="space-between" alignItems="center" marginTop="$2">
          <Text fontSize="$1" color="$gray9">
            {new Date(job.createdAt).toLocaleString()}
          </Text>
          {canRetry && (
            <TouchableOpacity
              onPress={() => onRetry(job.id)}
              disabled={isRetrying}
            >
              <View
                backgroundColor="$blue10"
                paddingHorizontal="$3"
                paddingVertical="$1"
                borderRadius="$2"
                opacity={isRetrying ? 0.5 : 1}
              >
                <Text fontSize="$2" fontWeight="600" color="white">
                  {isRetrying ? "Retrying..." : "Retry"}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </XStack>
      </YStack>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function JobQueuePage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<JobStatus | null>(null);
  const [typeFilter, setTypeFilter] = useState<JobSource | "all">("all");
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);

  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["admin", "jobs", statusFilter, typeFilter],
    queryFn: async () => {
      const response = await getJobs({
        status: statusFilter,
        type: typeFilter,
        limit: 50,
      });
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const retryMutation = useMutation({
    mutationFn: async (jobId: string) => {
      setRetryingJobId(jobId);
      const response = await retryJob(jobId);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (result) => {
      setRetryingJobId(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] });
      Alert.alert(
        "Job Restarted",
        `New job created: ${result?.newJobId?.slice(0, 16)}...`,
      );
    },
    onError: (error) => {
      setRetryingJobId(null);
      Alert.alert(
        "Retry Failed",
        error instanceof Error ? error.message : "Unknown error",
      );
    },
  });

  const handleRetry = (jobId: string) => {
    Alert.alert(
      "Retry Job",
      "This will create a new job and charge the user's token balance again. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Retry", onPress: () => retryMutation.mutate(jobId) },
      ],
    );
  };

  const renderHeader = () => (
    <YStack paddingVertical="$3">
      <H4 marginBottom="$3" color="$gray12">
        Filter by Status
      </H4>
      <StatusFilter
        selected={statusFilter}
        onSelect={setStatusFilter}
        counts={data?.statusCounts || {}}
      />

      <H4 marginBottom="$2" color="$gray12">
        Filter by Type
      </H4>
      <TypeFilter
        selected={typeFilter}
        onSelect={setTypeFilter}
        counts={data?.typeCounts || { all: 0, enhancement: 0, mcp: 0 }}
      />

      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$2" color="$gray10">
          {data?.jobs?.length || 0} jobs found
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
        No jobs found
      </Text>
      <Text fontSize="$2" color="$gray8" textAlign="center">
        {statusFilter
          ? `No jobs with status "${statusFilter}"`
          : "No jobs in the system yet"}
      </Text>
    </YStack>
  );

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Text color="$gray11">Loading jobs...</Text>
      </YStack>
    );
  }

  if (error) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text color="$red10" marginBottom="$2">
          Failed to load jobs
        </Text>
        <Text color="$gray10" fontSize="$2" textAlign="center">
          {error instanceof Error ? error.message : "Unknown error"}
        </Text>
        <TouchableOpacity onPress={() => refetch()}>
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
      data={data?.jobs || []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <JobCard
          job={item}
          onRetry={handleRetry}
          isRetrying={retryingJobId === item.id}
        />
      )}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmptyState}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    />
  );
}
