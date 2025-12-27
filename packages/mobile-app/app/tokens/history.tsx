/**
 * Transaction History Screen
 * Displays token transaction history with filtering
 */

import type { TokenTransaction, TokenTransactionType } from "@spike-npm-land/shared";
import { formatRelativeTime } from "@spike-npm-land/shared";
import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet } from "react-native";
import { Button, Card, H4, Paragraph, Spinner, Text, View, XStack, YStack } from "tamagui";

import { getTokenHistory } from "../../services/api/tokens";

// ============================================================================
// Types
// ============================================================================

type FilterType = "all" | "earn" | "spend" | "refund";

interface TransactionItemProps {
  transaction: TokenTransaction;
}

// ============================================================================
// Helper Functions
// ============================================================================

const getTransactionTypeInfo = (
  type: TokenTransactionType,
): { label: string; color: string; icon: string; } => {
  switch (type) {
    case "EARN_REGENERATION":
      return { label: "Regeneration", color: "$green10", icon: "+" };
    case "EARN_PURCHASE":
      return { label: "Purchase", color: "$green10", icon: "+" };
    case "EARN_BONUS":
      return { label: "Bonus", color: "$green10", icon: "+" };
    case "SPEND_ENHANCEMENT":
      return { label: "Enhancement", color: "$red10", icon: "-" };
    case "SPEND_MCP_GENERATION":
      return { label: "AI Generation", color: "$red10", icon: "-" };
    case "SPEND_BOX_CREATION":
      return { label: "Box Creation", color: "$red10", icon: "-" };
    case "REFUND":
      return { label: "Refund", color: "$blue10", icon: "+" };
    default:
      return { label: type, color: "$gray10", icon: "" };
  }
};

const isEarnType = (type: TokenTransactionType): boolean => {
  return type.startsWith("EARN_");
};

const isSpendType = (type: TokenTransactionType): boolean => {
  return type.startsWith("SPEND_");
};

// ============================================================================
// Transaction Item Component
// ============================================================================

function TransactionItem({ transaction }: TransactionItemProps) {
  const typeInfo = getTransactionTypeInfo(transaction.type);
  const date = new Date(transaction.createdAt);

  return (
    <Card elevate bordered padding="$4" marginBottom="$2">
      <XStack justifyContent="space-between" alignItems="center">
        <YStack flex={1}>
          <Paragraph fontWeight="600">{typeInfo.label}</Paragraph>
          <Paragraph size="$2" color="$gray10">
            {formatRelativeTime(date)}
          </Paragraph>
          {transaction.source && (
            <Paragraph size="$1" color="$gray9">
              {transaction.source}
            </Paragraph>
          )}
        </YStack>

        <YStack alignItems="flex-end">
          <XStack alignItems="center" gap="$1">
            <Text
              fontSize="$6"
              fontWeight="bold"
              color={typeInfo.color}
            >
              {typeInfo.icon}
              {Math.abs(transaction.amount)}
            </Text>
          </XStack>
          <Paragraph size="$1" color="$gray9">
            Balance: {transaction.balanceAfter}
          </Paragraph>
        </YStack>
      </XStack>
    </Card>
  );
}

// ============================================================================
// Filter Buttons Component
// ============================================================================

interface FilterButtonsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

function FilterButtons({ activeFilter, onFilterChange }: FilterButtonsProps) {
  const filters: { key: FilterType; label: string; }[] = [
    { key: "all", label: "All" },
    { key: "earn", label: "Earned" },
    { key: "spend", label: "Spent" },
    { key: "refund", label: "Refunds" },
  ];

  return (
    <XStack gap="$2" marginBottom="$4" flexWrap="wrap">
      {filters.map((filter) => (
        <Button
          key={filter.key}
          size="$3"
          theme={activeFilter === filter.key ? "blue" : "gray"}
          variant={activeFilter === filter.key ? "outlined" : "outlined"}
          onPress={() => onFilterChange(filter.key)}
          backgroundColor={activeFilter === filter.key ? "$blue3" : "transparent"}
        >
          {filter.label}
        </Button>
      ))}
    </XStack>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function TransactionHistoryScreen() {
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const ITEMS_PER_PAGE = 20;

  // Fetch transactions
  const fetchTransactions = useCallback(
    async (pageNum: number, refresh = false) => {
      if (refresh) {
        setIsRefreshing(true);
      } else if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      try {
        const response = await getTokenHistory({
          page: pageNum,
          limit: ITEMS_PER_PAGE,
        });

        if (response.error || !response.data) {
          throw new Error(response.error || "Failed to fetch transactions");
        }

        const data = response.data;

        if (pageNum === 1) {
          setTransactions(data.transactions);
        } else {
          setTransactions((prev) => [...prev, ...data.transactions]);
        }

        setTotal(data.total);
        setHasMore(data.transactions.length === ITEMS_PER_PAGE);
        setPage(pageNum);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load history");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [],
  );

  // Initial fetch
  useEffect(() => {
    fetchTransactions(1);
  }, [fetchTransactions]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    fetchTransactions(1, true);
  }, [fetchTransactions]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchTransactions(page + 1);
    }
  }, [fetchTransactions, isLoadingMore, hasMore, page]);

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    switch (filter) {
      case "earn":
        return isEarnType(tx.type);
      case "spend":
        return isSpendType(tx.type);
      case "refund":
        return tx.type === "REFUND";
      default:
        return true;
    }
  });

  // Render empty state
  const renderEmptyState = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyState}>
        <H4 color="$gray10" marginBottom="$2">
          No Transactions
        </H4>
        <Paragraph color="$gray9" textAlign="center">
          {filter === "all"
            ? "You haven't made any transactions yet."
            : `No ${filter} transactions found.`}
        </Paragraph>
      </View>
    );
  };

  // Render footer
  const renderFooter = () => {
    if (!isLoadingMore) return null;

    return (
      <View padding="$4" alignItems="center">
        <Spinner size="small" color="$blue10" />
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Spinner size="large" color="$blue10" />
        <Paragraph marginTop="$4">Loading transactions...</Paragraph>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Paragraph color="$red10" textAlign="center" marginBottom="$4">
          {error}
        </Paragraph>
        <Button onPress={handleRefresh} theme="blue">
          Try Again
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View padding="$4" paddingBottom="$2">
        <Card elevate bordered padding="$3" marginBottom="$3">
          <XStack justifyContent="space-around">
            <YStack alignItems="center">
              <Paragraph size="$2" color="$gray10">
                Total Transactions
              </Paragraph>
              <Text fontSize="$6" fontWeight="bold">
                {total}
              </Text>
            </YStack>
            <YStack alignItems="center">
              <Paragraph size="$2" color="$gray10">
                Showing
              </Paragraph>
              <Text fontSize="$6" fontWeight="bold">
                {filteredTransactions.length}
              </Text>
            </YStack>
          </XStack>
        </Card>

        <FilterButtons activeFilter={filter} onFilterChange={setFilter} />
      </View>

      {/* Transaction List */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionItem transaction={item} />}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
      />
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
});
