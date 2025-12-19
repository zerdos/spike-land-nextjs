/**
 * Meta Pixel Event Tracking Utilities
 *
 * Provides functions to fire Meta Pixel events for conversion tracking.
 * Maps internal analytics events to Meta Pixel standard and custom events.
 *
 * @see https://developers.facebook.com/docs/meta-pixel/reference
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Event mapping configuration
 */
export interface EventMappingConfig {
  /** The Meta Pixel event name to fire */
  metaEvent: string;
  /** Whether this is a standard Meta event or custom event */
  isStandard: boolean;
}

/**
 * Mapping from internal event names to Meta Pixel events
 *
 * Standard events recognized by Meta:
 * - Lead: User shows interest (signup started)
 * - CompleteRegistration: User completes signup
 * - InitiateCheckout: User starts checkout
 * - Purchase: User completes purchase
 *
 * Custom events are prefixed with trackCustom and can be any name.
 */
export const EVENT_MAPPING: Record<string, EventMappingConfig> = {
  signup_started: { metaEvent: "Lead", isStandard: true },
  signup_completed: { metaEvent: "CompleteRegistration", isStandard: true },
  purchase_started: { metaEvent: "InitiateCheckout", isStandard: true },
  purchase_completed: { metaEvent: "Purchase", isStandard: true },
  enhancement_started: { metaEvent: "EnhancementStarted", isStandard: false },
  enhancement_completed: {
    metaEvent: "EnhancementCompleted",
    isStandard: false,
  },
  album_created: { metaEvent: "AlbumCreated", isStandard: false },
  image_uploaded: { metaEvent: "ImageUploaded", isStandard: false },
};

/**
 * Fire a standard Meta Pixel event
 *
 * Standard events are predefined by Meta and provide richer analytics
 * in the Meta Events Manager.
 *
 * @param eventName - Standard event name (e.g., "Lead", "Purchase")
 * @param params - Optional event parameters
 *
 * @example
 * ```typescript
 * trackMetaEvent("Lead", { content_name: "Premium Plan" });
 * trackMetaEvent("Purchase", { value: 9.99, currency: "USD" });
 * ```
 */
export function trackMetaEvent(
  eventName: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", eventName, params);
  }
}

/**
 * Fire a custom Meta Pixel event
 *
 * Custom events can have any name and are useful for tracking
 * application-specific actions not covered by standard events.
 *
 * @param eventName - Custom event name
 * @param params - Optional event parameters
 *
 * @example
 * ```typescript
 * trackMetaCustomEvent("EnhancementCompleted", { tier: "TIER_4K" });
 * trackMetaCustomEvent("AlbumCreated", { imageCount: 5 });
 * ```
 */
export function trackMetaCustomEvent(
  eventName: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("trackCustom", eventName, params);
  }
}

/**
 * Fire a Meta Pixel event based on internal event name
 *
 * Automatically maps internal event names to the appropriate Meta Pixel
 * event (standard or custom) using the EVENT_MAPPING configuration.
 *
 * @param internalEventName - Internal analytics event name
 * @param params - Optional event parameters
 * @returns true if event was mapped and fired, false otherwise
 *
 * @example
 * ```typescript
 * // Fires "Lead" standard event
 * fireMetaPixelEvent("signup_started", { plan: "free" });
 *
 * // Fires "EnhancementCompleted" custom event
 * fireMetaPixelEvent("enhancement_completed", { tier: "TIER_4K" });
 *
 * // Returns false if no mapping exists
 * fireMetaPixelEvent("unknown_event"); // false
 * ```
 */
export function fireMetaPixelEvent(
  internalEventName: string,
  params?: Record<string, unknown>,
): boolean {
  const mapping = EVENT_MAPPING[internalEventName];

  if (!mapping) {
    return false;
  }

  if (mapping.isStandard) {
    trackMetaEvent(mapping.metaEvent, params);
  } else {
    trackMetaCustomEvent(mapping.metaEvent, params);
  }

  return true;
}
