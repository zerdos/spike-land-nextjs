/**
 * POD (Print-on-Demand) Provider Integration
 *
 * This module provides a unified interface for working with POD providers
 * like Prodigi and Printful.
 */

// Types
export type {
  PodOrderItem,
  PodOrderRequest,
  PodOrderResult,
  PodOrderStatus,
  PodProvider,
  PodProviderName,
  PodQuote,
  PodQuoteItem,
  PodQuoteLineItem,
  PodShippingOption,
  ShippingAddress,
} from "./types";

// Prodigi Provider
export { prodigiProvider, validateImageForProduct } from "./prodigi/client";

// Order Service
export {
  generateOrderNumber,
  getShippingQuote,
  submitOrderToPod,
  updateOrderFromWebhook,
} from "./order-service";
