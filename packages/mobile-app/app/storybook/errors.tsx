/**
 * Errors Page
 *
 * Displays error handling components and error boundaries.
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { borderRadius, colors, fontSize, spacing } from "@/constants/theme";

export default function ErrorsPage() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Errors</Text>
        <Text style={styles.subtitle}>
          Error handling components and error boundaries
        </Text>
      </View>

      {/* 404 Error */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>404 Not Found</Text>
        <Text style={styles.sectionDescription}>
          Page not found error state.
        </Text>

        <View style={styles.errorCard}>
          <View style={styles.errorIcon}>
            <Text style={styles.errorCode}>404</Text>
          </View>
          <Text style={styles.errorTitle}>Page Not Found</Text>
          <Text style={styles.errorMessage}>
            The page you're looking for doesn't exist or has been moved.
          </Text>
          <Button variant="outline">Go Home</Button>
        </View>
      </View>

      {/* 500 Error */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>500 Server Error</Text>
        <Text style={styles.sectionDescription}>
          Internal server error state.
        </Text>

        <View style={styles.errorCard}>
          <View style={[styles.errorIconCircle, { backgroundColor: `${colors.destructive}15` }]}>
            <Ionicons name="alert-circle" size={48} color={colors.destructive} />
          </View>
          <Text style={styles.errorTitle}>Server Error</Text>
          <Text style={styles.errorMessage}>
            Something went wrong on our end. Please try again later.
          </Text>
          <View style={styles.errorActions}>
            <Button variant="outline">Go Home</Button>
            <Button>Retry</Button>
          </View>
        </View>
      </View>

      {/* Network Error */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Network Error</Text>
        <Text style={styles.sectionDescription}>
          Connection failed error state.
        </Text>

        <View style={styles.errorCard}>
          <View style={[styles.errorIconCircle, { backgroundColor: `${colors.warning}15` }]}>
            <Ionicons name="cloud-offline" size={48} color={colors.warning} />
          </View>
          <Text style={styles.errorTitle}>No Connection</Text>
          <Text style={styles.errorMessage}>
            Please check your internet connection and try again.
          </Text>
          <Button iconLeft={<Ionicons name="refresh" size={18} color={colors.primaryForeground} />}>
            Retry Connection
          </Button>
        </View>
      </View>

      {/* Form Validation */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Form Validation Errors</Text>
        <Text style={styles.sectionDescription}>
          Inline field validation error states.
        </Text>

        <View style={styles.validationCard}>
          <View style={styles.validationItem}>
            <View style={styles.validationField}>
              <Text style={styles.validationLabel}>Email</Text>
              <View style={styles.validationInputError}>
                <Text style={styles.validationValue}>invalid-email</Text>
              </View>
              <View style={styles.validationError}>
                <Ionicons name="close-circle" size={14} color={colors.destructive} />
                <Text style={styles.validationErrorText}>Please enter a valid email address</Text>
              </View>
            </View>
          </View>

          <View style={styles.validationItem}>
            <View style={styles.validationField}>
              <Text style={styles.validationLabel}>Password</Text>
              <View style={styles.validationInputError}>
                <Text style={styles.validationValue}>weak</Text>
              </View>
              <View style={styles.validationError}>
                <Ionicons name="close-circle" size={14} color={colors.destructive} />
                <Text style={styles.validationErrorText}>
                  Password must be at least 8 characters
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.validationItem}>
            <View style={styles.validationField}>
              <Text style={styles.validationLabel}>Username</Text>
              <View style={styles.validationInputSuccess}>
                <Text style={styles.validationValue}>spike_user</Text>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              </View>
              <View style={styles.validationSuccess}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={styles.validationSuccessText}>Username is available</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Error Boundary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Error Boundary</Text>
        <Text style={styles.sectionDescription}>
          Fallback UI for runtime errors.
        </Text>

        <View style={styles.boundaryCard}>
          <View style={styles.boundaryHeader}>
            <Ionicons name="bug" size={32} color={colors.destructive} />
            <Text style={styles.boundaryTitle}>Something went wrong</Text>
          </View>
          <Text style={styles.boundaryMessage}>
            An unexpected error occurred. Our team has been notified.
          </Text>
          <View style={styles.boundaryDetails}>
            <Text style={styles.boundaryDetailsLabel}>Error Details:</Text>
            <View style={styles.boundaryCode}>
              <Text style={styles.boundaryCodeText}>
                TypeError: Cannot read property 'map' of undefined{"\n"}
                at ImageGallery (ImageGallery.tsx:42){"\n"}
                at renderWithHooks (...)
              </Text>
            </View>
          </View>
          <View style={styles.boundaryActions}>
            <Button
              variant="outline"
              iconLeft={<Ionicons name="copy-outline" size={18} color={colors.foreground} />}
            >
              Copy Error
            </Button>
            <Button>Reload App</Button>
          </View>
        </View>
      </View>

      {/* Empty States */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Empty States</Text>
        <Text style={styles.sectionDescription}>
          Helpful prompts when no data is available.
        </Text>

        <View style={styles.emptyCard}>
          <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons name="images-outline" size={32} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No Images Yet</Text>
          <Text style={styles.emptyMessage}>
            Upload your first image to get started with AI enhancement.
          </Text>
          <Button iconLeft={<Ionicons name="add" size={18} color={colors.primaryForeground} />}>
            Upload Image
          </Button>
        </View>
      </View>

      {/* API Error Codes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API Error Codes</Text>
        <Text style={styles.sectionDescription}>
          Common API errors and their meanings.
        </Text>

        <View style={styles.apiCard}>
          <View style={styles.apiRow}>
            <View style={styles.apiCode}>
              <Text style={styles.apiCodeText}>400</Text>
            </View>
            <View style={styles.apiInfo}>
              <Text style={styles.apiName}>Bad Request</Text>
              <Text style={styles.apiDesc}>Invalid request parameters</Text>
            </View>
          </View>
          <View style={styles.apiRow}>
            <View style={styles.apiCode}>
              <Text style={styles.apiCodeText}>401</Text>
            </View>
            <View style={styles.apiInfo}>
              <Text style={styles.apiName}>Unauthorized</Text>
              <Text style={styles.apiDesc}>Authentication required</Text>
            </View>
          </View>
          <View style={styles.apiRow}>
            <View style={styles.apiCode}>
              <Text style={styles.apiCodeText}>403</Text>
            </View>
            <View style={styles.apiInfo}>
              <Text style={styles.apiName}>Forbidden</Text>
              <Text style={styles.apiDesc}>Insufficient permissions</Text>
            </View>
          </View>
          <View style={styles.apiRow}>
            <View style={styles.apiCode}>
              <Text style={styles.apiCodeText}>429</Text>
            </View>
            <View style={styles.apiInfo}>
              <Text style={styles.apiName}>Rate Limited</Text>
              <Text style={styles.apiDesc}>Too many requests</Text>
            </View>
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
  errorCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[8],
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  errorIcon: {
    marginBottom: spacing[4],
  },
  errorCode: {
    fontSize: 64,
    fontWeight: "800",
    color: colors.mutedForeground,
    opacity: 0.5,
  },
  errorIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing[4],
  },
  errorTitle: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: spacing[2],
  },
  errorMessage: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    textAlign: "center",
    marginBottom: spacing[6],
    maxWidth: 300,
  },
  errorActions: {
    flexDirection: "row",
    gap: spacing[3],
  },
  validationCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing[4],
  },
  validationItem: {},
  validationField: {
    gap: spacing[2],
  },
  validationLabel: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: colors.foreground,
  },
  validationInputError: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.destructive,
    borderRadius: borderRadius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  validationInputSuccess: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: borderRadius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  validationValue: {
    fontSize: fontSize.sm,
    color: colors.foreground,
  },
  validationError: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
  },
  validationErrorText: {
    fontSize: fontSize.xs,
    color: colors.destructive,
  },
  validationSuccess: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
  },
  validationSuccessText: {
    fontSize: fontSize.xs,
    color: colors.success,
  },
  boundaryCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[6],
    borderWidth: 1,
    borderColor: colors.border,
  },
  boundaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  boundaryTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.foreground,
  },
  boundaryMessage: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing[4],
  },
  boundaryDetails: {
    marginBottom: spacing[4],
  },
  boundaryDetailsLabel: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.mutedForeground,
    marginBottom: spacing[2],
  },
  boundaryCode: {
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  boundaryCodeText: {
    fontSize: fontSize.xs,
    fontFamily: "monospace",
    color: colors.destructive,
  },
  boundaryActions: {
    flexDirection: "row",
    gap: spacing[3],
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[8],
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing[4],
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.foreground,
    marginBottom: spacing[2],
  },
  emptyMessage: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    textAlign: "center",
    marginBottom: spacing[6],
    maxWidth: 280,
  },
  apiCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing[3],
  },
  apiRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
  },
  apiCode: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    justifyContent: "center",
    alignItems: "center",
  },
  apiCodeText: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.destructive,
    fontFamily: "monospace",
  },
  apiInfo: {
    flex: 1,
  },
  apiName: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  apiDesc: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginTop: spacing[0.5],
  },
});
