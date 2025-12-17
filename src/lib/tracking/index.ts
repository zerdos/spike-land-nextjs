/**
 * Campaign Analytics Tracking Utilities
 *
 * This module provides utilities for tracking visitor sessions, UTM parameters,
 * and campaign attribution for marketing analytics.
 *
 * @example
 * ```typescript
 * import {
 *   captureUTMParams,
 *   getVisitorId,
 *   createSession,
 *   attributeConversion,
 * } from "@/lib/tracking";
 *
 * // Capture UTM params on page load
 * const params = captureUTMParams(new URL(window.location.href));
 *
 * // Get or create visitor ID
 * const visitorId = getVisitorId();
 *
 * // Create session
 * const sessionId = await createSession({
 *   visitorId,
 *   landingPage: window.location.pathname,
 *   utmParams: params,
 * });
 *
 * // Record conversion attribution
 * await attributeConversion(userId, "SIGNUP");
 * ```
 */

// UTM Parameter Capture
export {
  captureAndStoreUTM,
  captureUTMParams,
  clearUTMCookie,
  getPlatformFromUTM,
  getUTMFromCookies,
  storeUTMParams,
  type UTMParams,
} from "./utm-capture";

// Visitor ID Management
export {
  clearVisitorId,
  clearVisitorIdCookieServer,
  getOrCreateVisitorIdServer,
  getVisitorId,
  getVisitorIdFromCookie,
  getVisitorIdFromStorage,
  setVisitorId,
  setVisitorIdServerCookie,
  syncVisitorIdToCookie,
} from "./visitor-id";

// Session Management
export {
  clearSession,
  createSession,
  type CreateSessionData,
  endSession,
  getActiveSession,
  getSessionTimeoutMinutes,
  isSessionTimedOut,
  linkUserToSession,
  type PageViewData,
  recordEvent,
  recordPageView,
  setActiveSession,
  type TrackingEvent,
  updateLastActivity,
  updateSession,
  type UpdateSessionData,
} from "./session-manager";

// Attribution
export {
  attributeConversion,
  type AttributionParams,
  type AttributionType,
  type AttributionWithSession,
  type ConversionType,
  createAttribution,
  getAllAttributions,
  getCampaignAttributionSummary,
  getFirstTouchAttribution,
  getLastTouchAttribution,
  hasExistingAttribution,
} from "./attribution";

// Meta Pixel Tracking
export {
  EVENT_MAPPING,
  type EventMappingConfig,
  fireMetaPixelEvent,
  trackMetaCustomEvent,
  trackMetaEvent,
} from "./meta-pixel";
