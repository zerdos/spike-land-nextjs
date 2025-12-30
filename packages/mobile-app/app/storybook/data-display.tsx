/**
 * Data Display Page
 *
 * Displays tables, data grids, and copy buttons.
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { borderRadius, colors, fontSize, spacing } from "@/constants/theme";

const tableData = [
  { id: 1, name: "Premium Token", price: "$9.99", status: "Active" },
  { id: 2, name: "Standard Token", price: "$4.99", status: "Active" },
  { id: 3, name: "Trial Token", price: "Free", status: "Limited" },
];

export default function DataDisplayPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Data Display</Text>
        <Text style={styles.subtitle}>
          Tables, toggle groups, and copy buttons
        </Text>
      </View>

      {/* Table */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Table</Text>
        <Text style={styles.sectionDescription}>
          Structured data presentation with rows and columns.
        </Text>

        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.cellName]}>Name</Text>
            <Text style={[styles.tableHeaderCell, styles.cellPrice]}>
              Price
            </Text>
            <Text style={[styles.tableHeaderCell, styles.cellStatus]}>
              Status
            </Text>
          </View>

          {/* Table Body */}
          {tableData.map((row, index) => (
            <View
              key={row.id}
              style={[
                styles.tableRow,
                index === tableData.length - 1 && styles.tableRowLast,
              ]}
            >
              <Text style={[styles.tableCell, styles.cellName]}>
                {row.name}
              </Text>
              <Text style={[styles.tableCell, styles.cellPrice]}>
                {row.price}
              </Text>
              <View style={[styles.cellStatus]}>
                <View
                  style={[
                    styles.statusBadge,
                    row.status === "Active"
                      ? styles.statusActive
                      : styles.statusLimited,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      row.status === "Active"
                        ? styles.statusTextActive
                        : styles.statusTextLimited,
                    ]}
                  >
                    {row.status}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Copy Button */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Copy Button</Text>
        <Text style={styles.sectionDescription}>
          One-click copy functionality for code snippets and API keys.
        </Text>

        <View style={styles.copyContainer}>
          <View style={styles.codeBlock}>
            <Text style={styles.codeText}>sk-live-abc123xyz789...</Text>
            <Pressable
              style={(
                { pressed },
              ) => [styles.copyButton, pressed && styles.copyButtonPressed]}
              onPress={handleCopy}
            >
              <Ionicons
                name={copied ? "checkmark" : "copy-outline"}
                size={16}
                color={copied ? colors.success : colors.mutedForeground}
              />
            </Pressable>
          </View>
          {copied && (
            <Text style={styles.copiedText}>
              Copied to clipboard!
            </Text>
          )}
        </View>
      </View>

      {/* Toggle Group */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Toggle Group</Text>
        <Text style={styles.sectionDescription}>
          Segmented controls for selecting between options.
        </Text>

        <View style={styles.toggleGroupContainer}>
          <View style={styles.toggleGroup}>
            <Pressable style={[styles.toggleItem, styles.toggleItemActive]}>
              <Ionicons name="grid" size={18} color={colors.primary} />
              <Text style={[styles.toggleText, styles.toggleTextActive]}>
                Grid
              </Text>
            </Pressable>
            <Pressable style={styles.toggleItem}>
              <Ionicons name="list" size={18} color={colors.mutedForeground} />
              <Text style={styles.toggleText}>List</Text>
            </Pressable>
            <Pressable style={styles.toggleItem}>
              <Ionicons
                name="albums"
                size={18}
                color={colors.mutedForeground}
              />
              <Text style={styles.toggleText}>Cards</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stats Display</Text>
        <Text style={styles.sectionDescription}>
          Numerical data with labels and trends.
        </Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="trending-up" size={20} color={colors.success} />
            </View>
            <Text style={styles.statValue}>2,847</Text>
            <Text style={styles.statLabel}>Total Users</Text>
            <Text style={styles.statTrend}>+12.5% this month</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="flash" size={20} color={colors.warning} />
            </View>
            <Text style={styles.statValue}>1,234</Text>
            <Text style={styles.statLabel}>Active Jobs</Text>
            <Text style={styles.statTrend}>Processing now</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="wallet" size={20} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>$8,420</Text>
            <Text style={styles.statLabel}>Revenue</Text>
            <Text style={styles.statTrend}>+8.2% vs last week</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  header: {
    marginBottom: spacing[6],
  },
  title: {
    fontSize: fontSize["2xl"],
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    lineHeight: 24,
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.foreground,
    marginBottom: spacing[1],
  },
  sectionDescription: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing[3],
  },
  tableContainer: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.muted,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  tableHeaderCell: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: {
    fontSize: fontSize.sm,
    color: colors.foreground,
  },
  cellName: {
    flex: 2,
  },
  cellPrice: {
    flex: 1,
  },
  cellStatus: {
    flex: 1,
    alignItems: "flex-end",
  },
  statusBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: borderRadius.full,
  },
  statusActive: {
    backgroundColor: `${colors.success}20`,
  },
  statusLimited: {
    backgroundColor: `${colors.warning}20`,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextLimited: {
    color: colors.warning,
  },
  copyContainer: {
    gap: spacing[2],
  },
  codeBlock: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.foreground,
    fontFamily: "monospace",
  },
  copyButton: {
    padding: spacing[2],
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
  },
  copyButtonPressed: {
    opacity: 0.8,
  },
  copiedText: {
    fontSize: fontSize.xs,
    color: colors.success,
    textAlign: "center",
  },
  toggleGroupContainer: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleGroup: {
    flexDirection: "row",
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    padding: spacing[1],
  },
  toggleItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  toggleItemActive: {
    backgroundColor: colors.card,
  },
  toggleText: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: colors.mutedForeground,
  },
  toggleTextActive: {
    color: colors.primary,
  },
  statsGrid: {
    gap: spacing[3],
  },
  statCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
  },
  statHeader: {
    marginBottom: spacing[2],
  },
  statValue: {
    fontSize: fontSize["2xl"],
    fontWeight: "700",
    color: colors.foreground,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing[1],
  },
  statTrend: {
    fontSize: fontSize.xs,
    color: colors.success,
    marginTop: spacing[1],
  },
});
