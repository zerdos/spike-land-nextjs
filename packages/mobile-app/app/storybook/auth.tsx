/**
 * Auth Page
 *
 * Displays authentication components, buttons, and user avatars.
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { borderRadius, colors, fontSize, spacing } from "@/constants/theme";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Auth</Text>
        <Text style={styles.subtitle}>
          Authentication components, buttons, and user avatars
        </Text>
      </View>

      {/* Login Form */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Login Form</Text>
        <Text style={styles.sectionDescription}>
          Standard login form with email and password fields.
        </Text>

        <View style={styles.authCard}>
          <View style={styles.authHeader}>
            <View style={styles.authLogo}>
              <Ionicons name="diamond" size={24} color={colors.primary} />
            </View>
            <Text style={styles.authTitle}>Welcome back</Text>
            <Text style={styles.authSubtitle}>Sign in to your spike.land account</Text>
          </View>

          <View style={styles.formFields}>
            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              testID="login-email"
            />
            <View>
              <Input
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                testID="login-password"
                iconRight={
                  <Pressable onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={20}
                      color={colors.mutedForeground}
                    />
                  </Pressable>
                }
              />
            </View>
          </View>

          <Pressable style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </Pressable>

          <Button fullWidth>Sign In</Button>

          <View style={styles.signupLink}>
            <Text style={styles.signupText}>Don't have an account?</Text>
            <Pressable>
              <Text style={styles.signupLinkText}>Sign up</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Social Auth Buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Social Authentication</Text>
        <Text style={styles.sectionDescription}>
          OAuth providers for quick sign-in.
        </Text>

        <View style={styles.socialCard}>
          <Pressable style={styles.socialButton}>
            <Ionicons name="logo-google" size={20} color={colors.foreground} />
            <Text style={styles.socialButtonText}>Continue with Google</Text>
          </Pressable>
          <Pressable style={styles.socialButton}>
            <Ionicons name="logo-apple" size={20} color={colors.foreground} />
            <Text style={styles.socialButtonText}>Continue with Apple</Text>
          </Pressable>
          <Pressable style={styles.socialButton}>
            <Ionicons name="logo-github" size={20} color={colors.foreground} />
            <Text style={styles.socialButtonText}>Continue with GitHub</Text>
          </Pressable>
        </View>
      </View>

      {/* User Avatar */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Avatars</Text>
        <Text style={styles.sectionDescription}>
          Avatar display with various sizes and fallback states.
        </Text>

        <View style={styles.avatarCard}>
          <View style={styles.avatarRow}>
            <View style={[styles.avatar, styles.avatarSm]}>
              <Text style={styles.avatarText}>JD</Text>
            </View>
            <View style={[styles.avatar, styles.avatarMd]}>
              <Text style={styles.avatarText}>JD</Text>
            </View>
            <View style={[styles.avatar, styles.avatarLg]}>
              <Text style={styles.avatarText}>JD</Text>
            </View>
            <View style={[styles.avatar, styles.avatarXl]}>
              <Text style={[styles.avatarText, { fontSize: fontSize.xl }]}>JD</Text>
            </View>
          </View>

          <Text style={styles.avatarLabel}>With Status Indicators</Text>
          <View style={styles.avatarRow}>
            <View style={styles.avatarWrapper}>
              <View style={[styles.avatar, styles.avatarMd]}>
                <Ionicons name="person" size={20} color={colors.mutedForeground} />
              </View>
              <View style={[styles.statusDot, styles.statusOnline]} />
            </View>
            <View style={styles.avatarWrapper}>
              <View style={[styles.avatar, styles.avatarMd]}>
                <Ionicons name="person" size={20} color={colors.mutedForeground} />
              </View>
              <View style={[styles.statusDot, styles.statusAway]} />
            </View>
            <View style={styles.avatarWrapper}>
              <View style={[styles.avatar, styles.avatarMd]}>
                <Ionicons name="person" size={20} color={colors.mutedForeground} />
              </View>
              <View style={[styles.statusDot, styles.statusOffline]} />
            </View>
          </View>
        </View>
      </View>

      {/* User Menu */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Menu</Text>
        <Text style={styles.sectionDescription}>
          Dropdown menu for user profile actions.
        </Text>

        <View style={styles.userMenuCard}>
          <View style={styles.userMenuHeader}>
            <View style={[styles.avatar, styles.avatarMd]}>
              <Text style={styles.avatarText}>JD</Text>
            </View>
            <View style={styles.userMenuInfo}>
              <Text style={styles.userMenuName}>John Doe</Text>
              <Text style={styles.userMenuEmail}>john@example.com</Text>
            </View>
          </View>
          <View style={styles.userMenuDivider} />
          <Pressable style={styles.userMenuItem}>
            <Ionicons name="person-outline" size={18} color={colors.foreground} />
            <Text style={styles.userMenuItemText}>Profile</Text>
          </Pressable>
          <Pressable style={styles.userMenuItem}>
            <Ionicons name="settings-outline" size={18} color={colors.foreground} />
            <Text style={styles.userMenuItemText}>Settings</Text>
          </Pressable>
          <Pressable style={styles.userMenuItem}>
            <Ionicons name="wallet-outline" size={18} color={colors.foreground} />
            <Text style={styles.userMenuItemText}>Tokens</Text>
          </Pressable>
          <View style={styles.userMenuDivider} />
          <Pressable style={styles.userMenuItem}>
            <Ionicons name="log-out-outline" size={18} color={colors.destructive} />
            <Text style={[styles.userMenuItemText, { color: colors.destructive }]}>Sign Out</Text>
          </Pressable>
        </View>
      </View>

      {/* Auth States */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Auth States</Text>
        <Text style={styles.sectionDescription}>
          Visual indicators for authentication status.
        </Text>

        <View style={styles.statesCard}>
          <View style={styles.stateItem}>
            <View style={[styles.stateIcon, { backgroundColor: `${colors.success}15` }]}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            </View>
            <View style={styles.stateInfo}>
              <Text style={styles.stateTitle}>Authenticated</Text>
              <Text style={styles.stateDesc}>User is signed in</Text>
            </View>
          </View>
          <View style={styles.stateItem}>
            <View style={[styles.stateIcon, { backgroundColor: `${colors.warning}15` }]}>
              <Ionicons name="time" size={24} color={colors.warning} />
            </View>
            <View style={styles.stateInfo}>
              <Text style={styles.stateTitle}>Session Expiring</Text>
              <Text style={styles.stateDesc}>Token refresh needed</Text>
            </View>
          </View>
          <View style={styles.stateItem}>
            <View style={[styles.stateIcon, { backgroundColor: `${colors.destructive}15` }]}>
              <Ionicons name="close-circle" size={24} color={colors.destructive} />
            </View>
            <View style={styles.stateInfo}>
              <Text style={styles.stateTitle}>Unauthenticated</Text>
              <Text style={styles.stateDesc}>Login required</Text>
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
  authCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[6],
    borderWidth: 1,
    borderColor: colors.border,
  },
  authHeader: {
    alignItems: "center",
    marginBottom: spacing[6],
  },
  authLogo: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.xl,
    backgroundColor: `${colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing[4],
  },
  authTitle: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.foreground,
  },
  authSubtitle: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing[1],
  },
  formFields: {
    gap: spacing[4],
    marginBottom: spacing[2],
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: spacing[4],
  },
  forgotPasswordText: {
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  signupLink: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing[4],
  },
  signupText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  signupLinkText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: "600",
  },
  socialCard: {
    gap: spacing[3],
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[3],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  socialButtonText: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: colors.foreground,
  },
  avatarCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing[4],
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
  },
  avatar: {
    backgroundColor: colors.muted,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarSm: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarMd: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarLg: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarXl: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  avatarLabel: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  avatarWrapper: {
    position: "relative",
  },
  statusDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.card,
  },
  statusOnline: {
    backgroundColor: colors.success,
  },
  statusAway: {
    backgroundColor: colors.warning,
  },
  statusOffline: {
    backgroundColor: colors.mutedForeground,
  },
  userMenuCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[2],
    borderWidth: 1,
    borderColor: colors.border,
  },
  userMenuHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    padding: spacing[3],
  },
  userMenuInfo: {
    flex: 1,
  },
  userMenuName: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  userMenuEmail: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  userMenuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing[1],
  },
  userMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    padding: spacing[3],
    borderRadius: borderRadius.md,
  },
  userMenuItemText: {
    fontSize: fontSize.sm,
    color: colors.foreground,
  },
  statesCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing[4],
  },
  stateItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
  },
  stateIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  stateInfo: {
    flex: 1,
  },
  stateTitle: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  stateDesc: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginTop: spacing[0.5],
  },
});
