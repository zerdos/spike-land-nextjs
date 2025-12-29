/**
 * Merch Page
 *
 * Displays print-on-demand merchandise components.
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { borderRadius, colors, fontSize, spacing } from "@/constants/theme";

const mockProducts = [
  {
    id: 1,
    name: "spike.land Classic Tee",
    price: "$29.99",
    image: null,
    colors: ["#000000", "#FFFFFF", "#00E5FF"],
    sizes: ["S", "M", "L", "XL"],
  },
  {
    id: 2,
    name: "AI Spark Hoodie",
    price: "$59.99",
    image: null,
    colors: ["#000000", "#1A1A2E"],
    sizes: ["S", "M", "L", "XL", "XXL"],
  },
  {
    id: 3,
    name: "Dev Mode Cap",
    price: "$24.99",
    image: null,
    colors: ["#000000", "#00E5FF"],
    sizes: ["One Size"],
  },
];

export default function MerchPage() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Merch</Text>
        <Text style={styles.subtitle}>
          Print-on-demand merchandise components
        </Text>
      </View>

      {/* Product Cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Product Cards</Text>
        <Text style={styles.sectionDescription}>
          Display merchandise with images, variants, and pricing.
        </Text>

        <View style={styles.productsGrid}>
          {mockProducts.map((product) => (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productImage}>
                <Ionicons name="shirt-outline" size={48} color={colors.mutedForeground} />
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productPrice}>{product.price}</Text>
                <View style={styles.productColors}>
                  {product.colors.map((color, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.colorDot,
                        { backgroundColor: color },
                        color === "#FFFFFF" && styles.colorDotBorder,
                      ]}
                    />
                  ))}
                </View>
                <View style={styles.productSizes}>
                  {product.sizes.map((size) => (
                    <View key={size} style={styles.sizeChip}>
                      <Text style={styles.sizeText}>{size}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <Button size="sm" fullWidth>Add to Cart</Button>
            </View>
          ))}
        </View>
      </View>

      {/* Size Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Size Selector</Text>
        <Text style={styles.sectionDescription}>
          Interactive size selection with availability indicators.
        </Text>

        <View style={styles.sizeCard}>
          <Text style={styles.sizeLabel}>Select Size</Text>
          <View style={styles.sizeGrid}>
            <Pressable style={styles.sizeButton}>
              <Text style={styles.sizeButtonText}>XS</Text>
            </Pressable>
            <Pressable style={[styles.sizeButton, styles.sizeButtonActive]}>
              <Text style={[styles.sizeButtonText, styles.sizeButtonTextActive]}>S</Text>
            </Pressable>
            <Pressable style={styles.sizeButton}>
              <Text style={styles.sizeButtonText}>M</Text>
            </Pressable>
            <Pressable style={styles.sizeButton}>
              <Text style={styles.sizeButtonText}>L</Text>
            </Pressable>
            <Pressable style={styles.sizeButton}>
              <Text style={styles.sizeButtonText}>XL</Text>
            </Pressable>
            <Pressable style={[styles.sizeButton, styles.sizeButtonDisabled]}>
              <Text style={[styles.sizeButtonText, styles.sizeButtonTextDisabled]}>XXL</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Color Picker */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Color Picker</Text>
        <Text style={styles.sectionDescription}>
          Variant selection with color swatches.
        </Text>

        <View style={styles.colorCard}>
          <Text style={styles.colorLabel}>Color: Black</Text>
          <View style={styles.colorGrid}>
            <Pressable style={[styles.colorButton, styles.colorButtonActive]}>
              <View style={[styles.colorSwatch, { backgroundColor: "#000000" }]} />
              <View style={styles.colorCheck}>
                <Ionicons name="checkmark" size={12} color={colors.foreground} />
              </View>
            </Pressable>
            <Pressable style={styles.colorButton}>
              <View
                style={[styles.colorSwatch, {
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: colors.border,
                }]}
              />
            </Pressable>
            <Pressable style={styles.colorButton}>
              <View style={[styles.colorSwatch, { backgroundColor: colors.primary }]} />
            </Pressable>
            <Pressable style={styles.colorButton}>
              <View style={[styles.colorSwatch, { backgroundColor: "#1A1A2E" }]} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Quantity Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quantity Selector</Text>
        <Text style={styles.sectionDescription}>
          Increment/decrement controls for cart quantities.
        </Text>

        <View style={styles.quantityCard}>
          <Text style={styles.quantityLabel}>Quantity</Text>
          <View style={styles.quantityControls}>
            <Pressable style={styles.quantityButton}>
              <Ionicons name="remove" size={20} color={colors.foreground} />
            </Pressable>
            <Text style={styles.quantityValue}>1</Text>
            <Pressable style={styles.quantityButton}>
              <Ionicons name="add" size={20} color={colors.foreground} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Cart Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cart Summary</Text>
        <Text style={styles.sectionDescription}>
          Order summary with line items and totals.
        </Text>

        <View style={styles.cartCard}>
          <View style={styles.cartItem}>
            <View style={styles.cartItemImage}>
              <Ionicons name="shirt-outline" size={24} color={colors.mutedForeground} />
            </View>
            <View style={styles.cartItemInfo}>
              <Text style={styles.cartItemName}>spike.land Classic Tee</Text>
              <Text style={styles.cartItemVariant}>Black / M</Text>
            </View>
            <Text style={styles.cartItemPrice}>$29.99</Text>
          </View>
          <View style={styles.cartDivider} />
          <View style={styles.cartRow}>
            <Text style={styles.cartRowLabel}>Subtotal</Text>
            <Text style={styles.cartRowValue}>$29.99</Text>
          </View>
          <View style={styles.cartRow}>
            <Text style={styles.cartRowLabel}>Shipping</Text>
            <Text style={styles.cartRowValue}>$4.99</Text>
          </View>
          <View style={styles.cartDivider} />
          <View style={styles.cartRow}>
            <Text style={styles.cartTotalLabel}>Total</Text>
            <Text style={styles.cartTotalValue}>$34.98</Text>
          </View>
          <Button
            fullWidth
            iconRight={<Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />}
          >
            Checkout
          </Button>
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
  productsGrid: {
    gap: spacing[4],
  },
  productCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
  },
  productImage: {
    height: 160,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing[4],
  },
  productInfo: {
    marginBottom: spacing[4],
  },
  productName: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.foreground,
  },
  productPrice: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.primary,
    marginTop: spacing[1],
  },
  productColors: {
    flexDirection: "row",
    gap: spacing[2],
    marginTop: spacing[3],
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  colorDotBorder: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  productSizes: {
    flexDirection: "row",
    gap: spacing[1],
    marginTop: spacing[2],
  },
  sizeChip: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    backgroundColor: colors.muted,
    borderRadius: borderRadius.sm,
  },
  sizeText: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  sizeCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
  },
  sizeLabel: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.foreground,
    marginBottom: spacing[3],
  },
  sizeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  sizeButton: {
    minWidth: 48,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[3],
  },
  sizeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}15`,
  },
  sizeButtonDisabled: {
    opacity: 0.4,
  },
  sizeButtonText: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: colors.foreground,
  },
  sizeButtonTextActive: {
    color: colors.primary,
  },
  sizeButtonTextDisabled: {
    color: colors.mutedForeground,
  },
  colorCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorLabel: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.foreground,
    marginBottom: spacing[3],
  },
  colorGrid: {
    flexDirection: "row",
    gap: spacing[3],
  },
  colorButton: {
    position: "relative",
  },
  colorButtonActive: {},
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
  },
  colorCheck: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quantityLabel: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityValue: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.foreground,
    minWidth: 32,
    textAlign: "center",
  },
  cartCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing[4],
  },
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  cartItemImage: {
    width: 56,
    height: 56,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  cartItemVariant: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginTop: spacing[0.5],
  },
  cartItemPrice: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  cartDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  cartRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cartRowLabel: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  cartRowValue: {
    fontSize: fontSize.sm,
    color: colors.foreground,
  },
  cartTotalLabel: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.foreground,
  },
  cartTotalValue: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.primary,
  },
});
