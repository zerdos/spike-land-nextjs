/**
 * Modals Page
 *
 * Displays dialogs, dropdown menus, sheets, and alert dialogs.
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { borderRadius, colors, fontSize, spacing } from "@/constants/theme";

export default function ModalsPage() {
  const [basicModalVisible, setBasicModalVisible] = useState(false);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <View style={styles.fullContainer}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Modals</Text>
          <Text style={styles.subtitle}>
            Dialogs, dropdown menus, sheets, alert dialogs
          </Text>
        </View>

        {/* Basic Dialog */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Dialog</Text>
          <Text style={styles.sectionDescription}>
            Standard modal dialog for confirmations and information.
          </Text>

          <View style={styles.card}>
            <Button onPress={() => setBasicModalVisible(true)}>
              Open Dialog
            </Button>
          </View>
        </View>

        {/* Alert Dialog */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alert Dialog</Text>
          <Text style={styles.sectionDescription}>
            Confirmation dialog for destructive actions.
          </Text>

          <View style={styles.card}>
            <Button
              variant="destructive"
              onPress={() => setAlertModalVisible(true)}
            >
              Delete Item
            </Button>
          </View>
        </View>

        {/* Bottom Sheet */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bottom Sheet</Text>
          <Text style={styles.sectionDescription}>
            Action sheet that slides up from the bottom.
          </Text>

          <View style={styles.card}>
            <Button variant="outline" onPress={() => setSheetVisible(true)}>
              Open Sheet
            </Button>
          </View>
        </View>

        {/* Dropdown Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dropdown Menu</Text>
          <Text style={styles.sectionDescription}>
            Contextual menu for additional options.
          </Text>

          <View style={styles.card}>
            <Pressable
              style={styles.menuTrigger}
              onPress={() => setMenuVisible(!menuVisible)}
            >
              <Text style={styles.menuTriggerText}>Options</Text>
              <Ionicons
                name={menuVisible ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.foreground}
              />
            </Pressable>

            {menuVisible && (
              <View style={styles.menuDropdown}>
                <Pressable
                  style={styles.menuItem}
                  onPress={() => setMenuVisible(false)}
                >
                  <Ionicons
                    name="create-outline"
                    size={18}
                    color={colors.foreground}
                  />
                  <Text style={styles.menuItemText}>Edit</Text>
                </Pressable>
                <Pressable
                  style={styles.menuItem}
                  onPress={() => setMenuVisible(false)}
                >
                  <Ionicons
                    name="copy-outline"
                    size={18}
                    color={colors.foreground}
                  />
                  <Text style={styles.menuItemText}>Duplicate</Text>
                </Pressable>
                <Pressable
                  style={styles.menuItem}
                  onPress={() => setMenuVisible(false)}
                >
                  <Ionicons
                    name="share-outline"
                    size={18}
                    color={colors.foreground}
                  />
                  <Text style={styles.menuItemText}>Share</Text>
                </Pressable>
                <View style={styles.menuDivider} />
                <Pressable
                  style={styles.menuItem}
                  onPress={() => setMenuVisible(false)}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={colors.destructive}
                  />
                  <Text
                    style={[styles.menuItemText, { color: colors.destructive }]}
                  >
                    Delete
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* Modal Anatomy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Modal Anatomy</Text>
          <Text style={styles.sectionDescription}>
            Structure and components of a modal dialog.
          </Text>

          <View style={styles.anatomyCard}>
            <View style={styles.anatomyHeader}>
              <View style={styles.anatomyIcon}>
                <Ionicons
                  name="information-circle"
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View>
                <Text style={styles.anatomyTitle}>Dialog Title</Text>
                <Text style={styles.anatomySubtitle}>
                  Optional subtitle or description
                </Text>
              </View>
            </View>
            <View style={styles.anatomyBody}>
              <Text style={styles.anatomyBodyText}>
                Modal body content goes here. It can contain text, forms, images, or any other
                components.
              </Text>
            </View>
            <View style={styles.anatomyFooter}>
              <Button variant="outline" size="sm">Cancel</Button>
              <Button size="sm">Confirm</Button>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Basic Modal */}
      <Modal
        visible={basicModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBasicModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Welcome to spike.land</Text>
              <Pressable onPress={() => setBasicModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </Pressable>
            </View>
            <Text style={styles.modalBody}>
              This is a basic modal dialog. You can use it for displaying information,
              confirmations, or simple forms.
            </Text>
            <View style={styles.modalFooter}>
              <Button onPress={() => setBasicModalVisible(false)}>
                Got it!
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Alert Modal */}
      <Modal
        visible={alertModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAlertModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.alertIconContainer}>
              <Ionicons name="warning" size={48} color={colors.destructive} />
            </View>
            <Text style={styles.alertTitle}>Delete this item?</Text>
            <Text style={styles.alertMessage}>
              This action cannot be undone. This will permanently delete the item from your account.
            </Text>
            <View style={styles.alertFooter}>
              <Button
                variant="outline"
                onPress={() => setAlertModalVisible(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onPress={() => setAlertModalVisible(false)}
              >
                Delete
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Sheet */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetVisible(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() => setSheetVisible(false)}
          />
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Share Image</Text>
            <View style={styles.sheetOptions}>
              <Pressable
                style={styles.sheetOption}
                onPress={() => setSheetVisible(false)}
              >
                <View style={styles.sheetOptionIcon}>
                  <Ionicons
                    name="download-outline"
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.sheetOptionText}>Download</Text>
              </Pressable>
              <Pressable
                style={styles.sheetOption}
                onPress={() => setSheetVisible(false)}
              >
                <View style={styles.sheetOptionIcon}>
                  <Ionicons
                    name="copy-outline"
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.sheetOptionText}>Copy Link</Text>
              </Pressable>
              <Pressable
                style={styles.sheetOption}
                onPress={() => setSheetVisible(false)}
              >
                <View style={styles.sheetOptionIcon}>
                  <Ionicons
                    name="share-social-outline"
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.sheetOptionText}>Share to...</Text>
              </Pressable>
            </View>
            <Button
              variant="outline"
              fullWidth
              onPress={() => setSheetVisible(false)}
            >
              Cancel
            </Button>
          </View>
        </View>
      </Modal>
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
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
  },
  menuTriggerText: {
    fontSize: fontSize.base,
    fontWeight: "500",
    color: colors.foreground,
  },
  menuDropdown: {
    marginTop: spacing[2],
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  menuItemText: {
    fontSize: fontSize.sm,
    color: colors.foreground,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  anatomyCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  anatomyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  anatomyIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  anatomyTitle: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.foreground,
  },
  anatomySubtitle: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  anatomyBody: {
    padding: spacing[4],
  },
  anatomyBodyText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  anatomyFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing[2],
    padding: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[4],
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    width: "100%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[4],
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.foreground,
  },
  modalBody: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    lineHeight: 20,
    marginBottom: spacing[6],
  },
  modalFooter: {
    alignItems: "flex-end",
  },
  alertIconContainer: {
    alignItems: "center",
    marginBottom: spacing[4],
  },
  alertTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.foreground,
    textAlign: "center",
    marginBottom: spacing[2],
  },
  alertMessage: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing[6],
  },
  alertFooter: {
    flexDirection: "row",
    gap: spacing[3],
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sheetContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius["2xl"],
    borderTopRightRadius: borderRadius["2xl"],
    padding: spacing[6],
    paddingTop: spacing[3],
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.muted,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: spacing[4],
  },
  sheetTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.foreground,
    marginBottom: spacing[4],
  },
  sheetOptions: {
    marginBottom: spacing[4],
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    paddingVertical: spacing[3],
  },
  sheetOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetOptionText: {
    fontSize: fontSize.base,
    color: colors.foreground,
  },
});
