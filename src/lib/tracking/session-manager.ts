/**
 * Session Management Utilities
 *
 * Manages visitor sessions for campaign analytics, including page views,
 * custom events, and user linking.
 */

import { tryCatch } from "@/lib/try-catch";
import { fireMetaPixelEvent } from "./meta-pixel";
import type { UTMParams } from "./utm-capture";

/** Session storage key for current session ID */
const SESSION_STORAGE_KEY = "spike_session_id";

/** Session timeout in milliseconds (30 minutes) */
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/** Last activity timestamp key in sessionStorage */
const LAST_ACTIVITY_KEY = "spike_last_activity";

/**
 * Data required to create a new session
 */
export interface CreateSessionData {
  /** Anonymous visitor identifier */
  visitorId: string;
  /** First page URL of the session */
  landingPage: string;
  /** HTTP referrer URL */
  referrer?: string;
  /** Device type (mobile, tablet, desktop) */
  deviceType?: string;
  /** Browser name/version */
  browser?: string;
  /** Operating system */
  os?: string;
  /** UTM parameters captured from URL */
  utmParams?: UTMParams;
}

/**
 * Data for updating an existing session
 */
export interface UpdateSessionData {
  /** Last page URL of the session */
  exitPage?: string;
  /** Total page views in session */
  pageViewCount?: number;
  /** Session end timestamp */
  sessionEnd?: Date;
  /** User ID to link (after login/signup) */
  userId?: string;
}

/**
 * Custom tracking event data
 */
export interface TrackingEvent {
  /** Event name (e.g., "signup_started", "enhancement_completed") */
  name: string;
  /** Event category (e.g., "conversion", "engagement") */
  category?: string;
  /** Numeric value associated with event */
  value?: number;
  /** Additional event metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Page view data
 */
export interface PageViewData {
  /** Page path */
  path: string;
  /** Page title */
  title?: string;
  /** Time spent on page in seconds */
  timeOnPage?: number;
  /** Scroll depth percentage (0-100) */
  scrollDepth?: number;
}

/**
 * Check if cookie consent has been given
 */
function hasCookieConsent(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  return localStorage.getItem("cookie-consent") === "accepted";
}

/**
 * Get the active session ID from sessionStorage (client-side)
 *
 * Returns null if no session exists or if the session has timed out.
 *
 * @returns The current session ID or null
 *
 * @example
 * ```typescript
 * const sessionId = getActiveSession();
 * if (sessionId) {
 *   await recordPageView(sessionId, window.location.pathname);
 * }
 * ```
 */
export function getActiveSession(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  // Check consent
  if (!hasCookieConsent()) {
    return null;
  }

  const sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    return null;
  }

  // Check for timeout
  const lastActivity = sessionStorage.getItem(LAST_ACTIVITY_KEY);
  if (lastActivity) {
    const lastActivityTime = parseInt(lastActivity, 10);
    const now = Date.now();
    if (now - lastActivityTime > SESSION_TIMEOUT_MS) {
      // Session has timed out
      clearSession();
      return null;
    }
  }

  return sessionId;
}

/**
 * Store session ID in sessionStorage (client-side)
 *
 * @param sessionId - The session ID to store
 */
export function setActiveSession(sessionId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!hasCookieConsent()) {
    return;
  }

  sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  updateLastActivity();
}

/**
 * Update the last activity timestamp
 */
export function updateLastActivity(): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

/**
 * Clear the current session from sessionStorage
 */
export function clearSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  sessionStorage.removeItem(LAST_ACTIVITY_KEY);
}

/**
 * Create a new visitor session via API
 *
 * Creates a session record in the database and stores the session ID locally.
 *
 * @param data - Session creation data
 * @returns The new session ID
 * @throws Error if session creation fails
 *
 * @example
 * ```typescript
 * const sessionId = await createSession({
 *   visitorId: getVisitorId(),
 *   landingPage: window.location.pathname,
 *   referrer: document.referrer,
 *   utmParams: capturedParams,
 * });
 * ```
 */
export async function createSession(data: CreateSessionData): Promise<string> {
  const { data: response, error: fetchError } = await tryCatch(
    fetch("/api/tracking/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "create",
        ...data,
      }),
    }),
  );

  if (fetchError) {
    throw new Error("Failed to create session");
  }

  if (!response.ok) {
    const { data: errorData } = await tryCatch(response.json());
    throw new Error(errorData?.message || "Failed to create session");
  }

  const { data: result, error: parseError } = await tryCatch(response.json());

  if (parseError || !result?.sessionId) {
    throw new Error("Failed to create session");
  }

  const sessionId = result.sessionId;

  // Store session ID locally
  setActiveSession(sessionId);

  return sessionId;
}

/**
 * Update an existing session via API
 *
 * @param sessionId - The session ID to update
 * @param data - The update data
 * @throws Error if update fails
 *
 * @example
 * ```typescript
 * await updateSession(sessionId, {
 *   exitPage: window.location.pathname,
 *   pageViewCount: 5,
 * });
 * ```
 */
export async function updateSession(
  sessionId: string,
  data: UpdateSessionData,
): Promise<void> {
  // Update local activity timestamp
  updateLastActivity();

  const { data: response, error: fetchError } = await tryCatch(
    fetch("/api/tracking/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "update",
        sessionId,
        ...data,
      }),
    }),
  );

  if (fetchError) {
    throw new Error("Failed to update session");
  }

  if (!response.ok) {
    const { data: errorData } = await tryCatch(response.json());
    throw new Error(errorData?.message || "Failed to update session");
  }
}

/**
 * Record a page view for the current session
 *
 * @param sessionId - The session ID
 * @param path - The page path
 * @param title - Optional page title
 * @throws Error if recording fails
 *
 * @example
 * ```typescript
 * const sessionId = getActiveSession();
 * if (sessionId) {
 *   await recordPageView(sessionId, "/enhance", "Enhance Your Images");
 * }
 * ```
 */
export async function recordPageView(
  sessionId: string,
  path: string,
  title?: string,
): Promise<void> {
  // Update local activity timestamp
  updateLastActivity();

  const { data: response, error: fetchError } = await tryCatch(
    fetch("/api/tracking/pageview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        path,
        title,
      }),
    }),
  );

  if (fetchError) {
    throw new Error("Failed to record page view");
  }

  if (!response.ok) {
    const { data: errorData } = await tryCatch(response.json());
    throw new Error(errorData?.message || "Failed to record page view");
  }
}

/**
 * Record a custom tracking event
 *
 * @param sessionId - The session ID
 * @param event - The event data
 * @throws Error if recording fails
 *
 * @example
 * ```typescript
 * await recordEvent(sessionId, {
 *   name: "enhancement_completed",
 *   category: "conversion",
 *   value: 100, // tokens spent
 *   metadata: { tier: "TIER_4K" },
 * });
 * ```
 */
export async function recordEvent(
  sessionId: string,
  event: TrackingEvent,
): Promise<void> {
  // Fire Meta Pixel event (client-side, non-blocking)
  fireMetaPixelEvent(event.name, { ...event.metadata, value: event.value });

  // Update local activity timestamp
  updateLastActivity();

  const { data: response, error: fetchError } = await tryCatch(
    fetch("/api/tracking/event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        ...event,
      }),
    }),
  );

  if (fetchError) {
    throw new Error("Failed to record event");
  }

  if (!response.ok) {
    const { data: errorData } = await tryCatch(response.json());
    throw new Error(errorData?.message || "Failed to record event");
  }
}

/**
 * Link a user to the current session after login/signup
 *
 * This associates the anonymous session with an authenticated user,
 * enabling cross-session attribution tracking.
 *
 * @param sessionId - The session ID to link
 * @param userId - The user ID to associate
 * @throws Error if linking fails
 *
 * @example
 * ```typescript
 * // After successful login
 * const sessionId = getActiveSession();
 * if (sessionId && user.id) {
 *   await linkUserToSession(sessionId, user.id);
 * }
 * ```
 */
export async function linkUserToSession(
  sessionId: string,
  userId: string,
): Promise<void> {
  const { data: response, error: fetchError } = await tryCatch(
    fetch("/api/tracking/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "link",
        sessionId,
        userId,
      }),
    }),
  );

  if (fetchError) {
    throw new Error("Failed to link user to session");
  }

  if (!response.ok) {
    const { data: errorData } = await tryCatch(response.json());
    throw new Error(errorData?.message || "Failed to link user to session");
  }
}

/**
 * End the current session
 *
 * Records the session end time and clears local storage.
 *
 * @param sessionId - The session ID to end
 *
 * @example
 * ```typescript
 * // On page unload or logout
 * const sessionId = getActiveSession();
 * if (sessionId) {
 *   await endSession(sessionId);
 * }
 * ```
 */
export async function endSession(sessionId: string): Promise<void> {
  const { error } = await tryCatch(
    updateSession(sessionId, {
      sessionEnd: new Date(),
    }),
  );
  // Always clear session, regardless of API result
  clearSession();
  // Re-throw if there was an error
  if (error) {
    throw error;
  }
}

/**
 * Check if the current session has timed out
 *
 * @returns true if session has timed out
 */
export function isSessionTimedOut(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const lastActivity = sessionStorage.getItem(LAST_ACTIVITY_KEY);
  if (!lastActivity) {
    return false;
  }

  const lastActivityTime = parseInt(lastActivity, 10);
  return Date.now() - lastActivityTime > SESSION_TIMEOUT_MS;
}

/**
 * Get the session timeout duration in minutes
 *
 * @returns Session timeout in minutes
 */
export function getSessionTimeoutMinutes(): number {
  return SESSION_TIMEOUT_MS / (60 * 1000);
}
