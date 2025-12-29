/**
 * Feedback Page
 *
 * Displays toast notifications, alerts, and semantic state colors.
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { SlideInRight, SlideOutRight } from "react-native-reanimated";

import { borderRadius, colors, fontSize, spacing } from "@/constants/theme";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message: string;
}

export default function FeedbackPage() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: ToastType) => {
    const toastMessages: Record<ToastType, { title: string; message: string; }> = {
      success: { title: "Success!", message: "Your changes have been saved." },
      error: { title: "Error", message: "Something went wrong. Please try again." },
      warning: { title: "Warning", message: "Your session will expire in 5 minutes." },
      info: { title: "Info", message: "New features are available!" },
    };

    const newToast: Toast = {
      id: Date.now(),
      type,
      ...toastMessages[type],
    };

    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 3000);
  };

  const getToastColors = (type: ToastType) => {
    switch (type) {
      case "success":
        return { bg: `${colors.success}20`, border: colors.success, icon: colors.success };
      case "error":
        return {
          bg: `${colors.destructive}20`,
          border: colors.destructive,
          icon: colors.destructive,
        };
      case "warning":
        return { bg: `${colors.warning}20`, border: colors.warning, icon: colors.warning };
      case "info":
        return { bg: `${colors.primary}20`, border: colors.primary, icon: colors.primary };
    }
  };

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return "checkmark-circle";
      case "error":
        return "alert-circle";
      case "warning":
        return "warning";
      case "info":
        return "information-circle";
    }
  };

  return (
    <View style={styles.fullContainer}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Feedback</Text>
          <Text style={styles.subtitle}>
            Toast notifications, alerts, semantic state colors
          </Text>
        </View>

        {/* Toast Triggers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Toast Notifications</Text>
          <Text style={styles.sectionDescription}>
            Temporary messages that appear and auto-dismiss.
          </Text>

          <View style={styles.buttonGrid}>
            <Pressable
              style={[styles.triggerButton, {
                backgroundColor: `${colors.success}20`,
                borderColor: colors.success,
              }]}
              onPress={() => showToast("success")}
            >
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={[styles.triggerButtonText, { color: colors.success }]}>Success</Text>
            </Pressable>
            <Pressable
              style={[styles.triggerButton, {
                backgroundColor: `${colors.destructive}20`,
                borderColor: colors.destructive,
              }]}
              onPress={() => showToast("error")}
            >
              <Ionicons name="alert-circle" size={20} color={colors.destructive} />
              <Text style={[styles.triggerButtonText, { color: colors.destructive }]}>Error</Text>
            </Pressable>
            <Pressable
              style={[styles.triggerButton, {
                backgroundColor: `${colors.warning}20`,
                borderColor: colors.warning,
              }]}
              onPress={() => showToast("warning")}
            >
              <Ionicons name="warning" size={20} color={colors.warning} />
              <Text style={[styles.triggerButtonText, { color: colors.warning }]}>Warning</Text>
            </Pressable>
            <Pressable
              style={[styles.triggerButton, {
                backgroundColor: `${colors.primary}20`,
                borderColor: colors.primary,
              }]}
              onPress={() => showToast("info")}
            >
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text style={[styles.triggerButtonText, { color: colors.primary }]}>Info</Text>
            </Pressable>
          </View>
        </View>

        {/* Static Alerts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alert States</Text>
          <Text style={styles.sectionDescription}>
            Persistent alerts for important information.
          </Text>

          <View style={styles.alertsContainer}>
            <View
              style={[styles.alert, {
                backgroundColor: `${colors.success}15`,
                borderColor: `${colors.success}30`,
              }]}
            >
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>Deployment Successful</Text>
                <Text style={styles.alertMessage}>
                  Your app has been deployed to production.
                </Text>
              </View>
            </View>

            <View
              style={[styles.alert, {
                backgroundColor: `${colors.destructive}15`,
                borderColor: `${colors.destructive}30`,
              }]}
            >
              <Ionicons name="alert-circle" size={24} color={colors.destructive} />
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>Critical Error</Text>
                <Text style={styles.alertMessage}>
                  The database connection failed. Please check your credentials.
                </Text>
              </View>
            </View>

            <View
              style={[styles.alert, {
                backgroundColor: `${colors.warning}15`,
                borderColor: `${colors.warning}30`,
              }]}
            >
              <Ionicons name="warning" size={24} color={colors.warning} />
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>Low Storage</Text>
                <Text style={styles.alertMessage}>
                  You're running low on storage space. Consider upgrading.
                </Text>
              </View>
            </View>

            <View
              style={[styles.alert, {
                backgroundColor: `${colors.primary}15`,
                borderColor: `${colors.primary}30`,
              }]}
            >
              <Ionicons name="information-circle" size={24} color={colors.primary} />
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>System Update</Text>
                <Text style={styles.alertMessage}>
                  A new version of the platform is available.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Semantic Colors */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Semantic Colors</Text>
          <Text style={styles.sectionDescription}>
            Colors that convey meaning and system states.
          </Text>

          <View style={styles.semanticGrid}>
            <View style={styles.semanticCard}>
              <View style={[styles.semanticSwatch, { backgroundColor: colors.success }]} />
              <Text style={styles.semanticName}>Success</Text>
              <Text style={styles.semanticDesc}>Positive outcomes</Text>
            </View>
            <View style={styles.semanticCard}>
              <View style={[styles.semanticSwatch, { backgroundColor: colors.destructive }]} />
              <Text style={styles.semanticName}>Destructive</Text>
              <Text style={styles.semanticDesc}>Errors & danger</Text>
            </View>
            <View style={styles.semanticCard}>
              <View style={[styles.semanticSwatch, { backgroundColor: colors.warning }]} />
              <Text style={styles.semanticName}>Warning</Text>
              <Text style={styles.semanticDesc}>Caution needed</Text>
            </View>
            <View style={styles.semanticCard}>
              <View style={[styles.semanticSwatch, { backgroundColor: colors.primary }]} />
              <Text style={styles.semanticName}>Info</Text>
              <Text style={styles.semanticDesc}>Information</Text>
            </View>
          </View>
        </View>

        {/* Progress States */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progress Indicators</Text>
          <Text style={styles.sectionDescription}>
            Visual feedback for ongoing operations.
          </Text>

          <View style={styles.progressCard}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Processing</Text>
              <Text style={styles.progressValue}>65%</Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: "65%", backgroundColor: colors.primary }]}
              />
            </View>
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Upload Complete</Text>
              <Text style={[styles.progressValue, { color: colors.success }]}>100%</Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: "100%", backgroundColor: colors.success }]}
              />
            </View>
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Storage Used</Text>
              <Text style={[styles.progressValue, { color: colors.destructive }]}>95%</Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: "95%", backgroundColor: colors.destructive }]}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Toast Container */}
      <View style={styles.toastContainer}>
        {toasts.map((toast) => {
          const toastColors = getToastColors(toast.type);
          return (
            <Animated.View
              key={toast.id}
              entering={SlideInRight}
              exiting={SlideOutRight}
              style={[
                styles.toast,
                { backgroundColor: toastColors.bg, borderColor: toastColors.border },
              ]}
            >
              <Ionicons name={getToastIcon(toast.type)} size={20} color={toastColors.icon} />
              <View style={styles.toastContent}>
                <Text style={styles.toastTitle}>{toast.title}</Text>
                <Text style={styles.toastMessage}>{toast.message}</Text>
              </View>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
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
  buttonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[3],
  },
  triggerButton: {
    flex: 1,
    minWidth: 140,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  triggerButtonText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  alertsContainer: {
    gap: spacing[3],
  },
  alert: {
    flexDirection: "row",
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing[3],
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.foreground,
    marginBottom: spacing[1],
  },
  alertMessage: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  semanticGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[3],
  },
  semanticCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  semanticSwatch: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    marginBottom: spacing[2],
  },
  semanticName: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  semanticDesc: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginTop: spacing[1],
  },
  progressCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing[3],
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing[2],
  },
  progressLabel: {
    fontSize: fontSize.sm,
    color: colors.foreground,
  },
  progressValue: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: borderRadius.full,
  },
  toastContainer: {
    position: "absolute",
    top: spacing[4],
    right: spacing[4],
    left: spacing[4],
    gap: spacing[2],
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing[3],
  },
  toastContent: {
    flex: 1,
  },
  toastTitle: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  toastMessage: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginTop: spacing[0.5],
  },
});
