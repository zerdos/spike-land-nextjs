/**
 * RevenueCat Purchases Service
 * Handles In-App Purchases for token packages
 */

import { REVENUECAT_PRODUCTS } from "@spike-land/shared";
import { Platform } from "react-native";
import Purchases, {
  type CustomerInfo,
  LOG_LEVEL,
  type PurchasesPackage,
} from "react-native-purchases";
import { apiClient } from "./api-client";

// ============================================================================
// Types
// ============================================================================

export interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  price: string;
  priceValue: number;
  currencyCode: string;
  productIdentifier: string;
  rcPackage: PurchasesPackage;
}

export interface PurchaseResult {
  success: boolean;
  error?: string;
  tokensAdded?: number;
  newBalance?: number;
}

export type TokenPackageId = keyof typeof REVENUECAT_PRODUCTS.TOKEN_PACKAGES;

// ============================================================================
// Configuration
// ============================================================================

const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || "";
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || "";

// ============================================================================
// Service Class
// ============================================================================

class PurchasesService {
  private initialized = false;
  private packages: TokenPackage[] = [];

  /**
   * Initialize RevenueCat SDK
   * Should be called once on app startup
   */
  async initialize(userId?: string): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);

      const apiKey = Platform.OS === "ios"
        ? REVENUECAT_API_KEY_IOS
        : REVENUECAT_API_KEY_ANDROID;

      if (!apiKey) {
        console.warn("RevenueCat API key not configured for this platform");
        return;
      }

      await Purchases.configure({ apiKey });

      // Identify user if logged in
      if (userId) {
        await this.identifyUser(userId);
      }

      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize RevenueCat:", error);
      throw error;
    }
  }

  /**
   * Identify user with RevenueCat
   */
  async identifyUser(userId: string): Promise<void> {
    try {
      await Purchases.logIn(userId);
    } catch (error) {
      console.error("Failed to identify user with RevenueCat:", error);
    }
  }

  /**
   * Log out user from RevenueCat
   */
  async logOut(): Promise<void> {
    try {
      await Purchases.logOut();
    } catch (error) {
      console.error("Failed to log out from RevenueCat:", error);
    }
  }

  /**
   * Get available token packages
   */
  async getTokenPackages(): Promise<TokenPackage[]> {
    if (!this.initialized) {
      throw new Error("Purchases service not initialized");
    }

    try {
      const offerings = await Purchases.getOfferings();

      if (!offerings.current) {
        console.warn("No current offering found");
        return [];
      }

      const packages = offerings.current.availablePackages;
      this.packages = packages.map((pkg) => this.mapPackageToTokenPackage(pkg));

      return this.packages;
    } catch (error) {
      console.error("Failed to get token packages:", error);
      throw error;
    }
  }

  /**
   * Map RevenueCat package to our TokenPackage type
   */
  private mapPackageToTokenPackage(pkg: PurchasesPackage): TokenPackage {
    const productId = pkg.product.identifier;
    const tokens = this.getTokensForProduct(productId);

    return {
      id: pkg.identifier,
      name: pkg.product.title,
      tokens,
      price: pkg.product.priceString,
      priceValue: pkg.product.price,
      currencyCode: pkg.product.currencyCode,
      productIdentifier: productId,
      rcPackage: pkg,
    };
  }

  /**
   * Get token count for a product identifier
   */
  private getTokensForProduct(productId: string): number {
    const tokenMap: Record<string, number> = {
      [REVENUECAT_PRODUCTS.TOKEN_PACKAGES.STARTER]: 50,
      [REVENUECAT_PRODUCTS.TOKEN_PACKAGES.PRO]: 150,
      [REVENUECAT_PRODUCTS.TOKEN_PACKAGES.POWER]: 500,
    };

    return tokenMap[productId] || 0;
  }

  /**
   * Purchase a token package
   */
  async purchasePackage(packageId: string): Promise<PurchaseResult> {
    if (!this.initialized) {
      return { success: false, error: "Purchases service not initialized" };
    }

    try {
      const pkg = this.packages.find((p) => p.id === packageId);

      if (!pkg) {
        return { success: false, error: "Package not found" };
      }

      // Make the purchase through RevenueCat
      const { customerInfo } = await Purchases.purchasePackage(pkg.rcPackage);

      // Verify the purchase with our backend
      const verifyResult = await this.verifyPurchase(
        pkg.productIdentifier,
        pkg.tokens,
      );

      if (!verifyResult.success) {
        return {
          success: false,
          error: verifyResult.error || "Failed to verify purchase",
        };
      }

      return {
        success: true,
        tokensAdded: verifyResult.tokensAdded,
        newBalance: verifyResult.newBalance,
      };
    } catch (error: unknown) {
      // Check if user cancelled the purchase
      if (
        error &&
        typeof error === "object" &&
        "userCancelled" in error &&
        error.userCancelled
      ) {
        return { success: false, error: "Purchase cancelled" };
      }

      const errorMessage = error instanceof Error ? error.message : "Purchase failed";
      console.error("Purchase failed:", error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Verify purchase with our backend and credit tokens
   */
  private async verifyPurchase(
    productId: string,
    tokens: number,
  ): Promise<{
    success: boolean;
    error?: string;
    tokensAdded?: number;
    newBalance?: number;
  }> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();

      const response = await apiClient.post<{
        success: boolean;
        tokensAdded: number;
        newBalance: number;
      }>("/api/tokens/verify-purchase", {
        productId,
        expectedTokens: tokens,
        rcCustomerId: customerInfo.originalAppUserId,
        platform: Platform.OS,
      });

      if (response.error || !response.data) {
        return { success: false, error: response.error || "Verification failed" };
      }

      return {
        success: true,
        tokensAdded: response.data.tokensAdded,
        newBalance: response.data.newBalance,
      };
    } catch (error) {
      console.error("Purchase verification failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Verification failed",
      };
    }
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases(): Promise<{
    success: boolean;
    restored: number;
    error?: string;
  }> {
    if (!this.initialized) {
      return {
        success: false,
        restored: 0,
        error: "Purchases service not initialized",
      };
    }

    try {
      const customerInfo = await Purchases.restorePurchases();

      // Notify backend about restore
      const response = await apiClient.post<{
        restored: number;
      }>("/api/tokens/restore", {
        rcCustomerId: customerInfo.originalAppUserId,
        platform: Platform.OS,
      });

      return {
        success: true,
        restored: response.data?.restored || 0,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Restore failed";
      console.error("Restore purchases failed:", error);
      return { success: false, restored: 0, error: errorMessage };
    }
  }

  /**
   * Get current customer info
   */
  async getCustomerInfo(): Promise<CustomerInfo | null> {
    if (!this.initialized) {
      return null;
    }

    try {
      return await Purchases.getCustomerInfo();
    } catch (error) {
      console.error("Failed to get customer info:", error);
      return null;
    }
  }

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const purchasesService = new PurchasesService();
export default purchasesService;
