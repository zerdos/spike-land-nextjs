"use client";

import { tryCatch } from "@/lib/try-catch";
import { useCallback } from "react";

// Storage keys
const VISITOR_ID_KEY = "spike_visitor_id";
const SESSION_ID_KEY = "spike_session_id";
const CONSENT_KEY = "cookie-consent";

/**
 * Conversion types for tracking
 */
export type ConversionType = "signup" | "enhancement" | "purchase";

/**
 * Event stage: started or completed
 */
export type EventStage = "started" | "completed";

/**
 * Allowed event names from the backend whitelist
 */
export type AllowedEventName =
  | "signup_started"
  | "signup_completed"
  | "enhancement_started"
  | "enhancement_completed"
  | "purchase_started"
  | "purchase_completed"
  | "page_scroll_25"
  | "page_scroll_50"
  | "page_scroll_75"
  | "page_scroll_100"
  | "time_on_page_30s"
  | "time_on_page_60s"
  | "time_on_page_180s";

/**
 * Check if user has given cookie consent
 */
function hasConsent(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CONSENT_KEY) === "accepted";
}

/**
 * Get the current session ID from sessionStorage
 */
function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(SESSION_ID_KEY);
}

/**
 * Get the visitor ID from localStorage
 */
function getVisitorId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(VISITOR_ID_KEY);
}

/**
 * Custom hook for manual event tracking
 *
 * Provides methods to track custom events and conversions
 * from anywhere in the application.
 *
 * @example
 * ```tsx
 * const { trackEvent, trackConversion } = useTracking();
 *
 * // Track a whitelisted event
 * trackEvent("signup_started");
 * trackEvent("enhancement_completed", 5); // with token value
 *
 * // Track a conversion (shorthand for _completed events)
 * trackConversion("signup");
 * trackConversion("purchase", 29.99);
 *
 * // Track conversion started (for funnel tracking)
 * trackConversionStarted("signup");
 * ```
 */
export function useTracking() {
  /**
   * Track a whitelisted event
   *
   * @param name - Event name (must be in the allowed whitelist)
   * @param value - Optional numeric value
   * @param metadata - Optional additional data
   */
  const trackEvent = useCallback(
    async (
      name: AllowedEventName,
      value?: number,
      metadata?: Record<string, unknown>,
    ): Promise<void> => {
      if (!hasConsent()) return;

      const sessionId = getSessionId();
      if (!sessionId) {
        console.warn("[Tracking] No active session for event tracking");
        return;
      }

      const { data: response, error } = await tryCatch(
        fetch("/api/tracking/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            name,
            value,
            metadata,
          }),
        }),
      );

      if (error) {
        // Silently fail - tracking should not impact UX
        console.warn("[Tracking] Error tracking event:", error);
        return;
      }

      if (!response.ok) {
        console.warn(`[Tracking] Failed to track event: ${response.status}`);
      }
    },
    [],
  );

  /**
   * Track a conversion completed event
   *
   * @param type - Conversion type (signup, enhancement, purchase)
   * @param value - Optional monetary or token value
   */
  const trackConversion = useCallback(
    async (type: ConversionType, value?: number): Promise<void> => {
      if (!hasConsent()) return;

      const sessionId = getSessionId();
      if (!sessionId) {
        console.warn("[Tracking] No active session for conversion tracking");
        return;
      }

      // Map conversion type to whitelisted event name
      const eventName = `${type}_completed` as AllowedEventName;

      const { data: response, error } = await tryCatch(
        fetch("/api/tracking/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            name: eventName,
            value,
            metadata: {
              conversionType: type,
              timestamp: new Date().toISOString(),
            },
          }),
        }),
      );

      if (error) {
        // Silently fail - tracking should not impact UX
        console.warn("[Tracking] Error tracking conversion:", error);
        return;
      }

      if (!response.ok) {
        console.warn(
          `[Tracking] Failed to track conversion: ${response.status}`,
        );
      }
    },
    [],
  );

  /**
   * Track a conversion started event (for funnel tracking)
   *
   * @param type - Conversion type (signup, enhancement, purchase)
   */
  const trackConversionStarted = useCallback(
    async (type: ConversionType): Promise<void> => {
      if (!hasConsent()) return;

      const sessionId = getSessionId();
      if (!sessionId) {
        console.warn("[Tracking] No active session for conversion tracking");
        return;
      }

      // Map conversion type to whitelisted event name
      const eventName = `${type}_started` as AllowedEventName;

      const { data: response, error } = await tryCatch(
        fetch("/api/tracking/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            name: eventName,
            metadata: {
              conversionType: type,
              timestamp: new Date().toISOString(),
            },
          }),
        }),
      );

      if (error) {
        // Silently fail - tracking should not impact UX
        console.warn("[Tracking] Error tracking conversion started:", error);
        return;
      }

      if (!response.ok) {
        console.warn(
          `[Tracking] Failed to track conversion started: ${response.status}`,
        );
      }
    },
    [],
  );

  /**
   * Get the current session ID
   */
  const getCurrentSessionId = useCallback((): string | null => {
    return getSessionId();
  }, []);

  /**
   * Get the visitor ID
   */
  const getCurrentVisitorId = useCallback((): string | null => {
    return getVisitorId();
  }, []);

  /**
   * Check if tracking is enabled (consent given and session active)
   */
  const isTrackingEnabled = useCallback((): boolean => {
    return hasConsent() && getSessionId() !== null;
  }, []);

  return {
    trackEvent,
    trackConversion,
    trackConversionStarted,
    getSessionId: getCurrentSessionId,
    getVisitorId: getCurrentVisitorId,
    isTrackingEnabled,
  };
}

export default useTracking;
