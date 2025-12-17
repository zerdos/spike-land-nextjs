/**
 * Visitor ID Management Utilities
 *
 * Manages anonymous visitor identification for tracking across sessions.
 * Uses both localStorage (for client persistence) and cookies (for server access).
 */

import { nanoid } from "nanoid";
import { cookies } from "next/headers";

/** Storage key for visitor ID in localStorage */
const VISITOR_ID_STORAGE_KEY = "spike_visitor_id";

/** Cookie name for visitor ID */
const VISITOR_ID_COOKIE_NAME = "spike_visitor_id";

/** Cookie expiry in seconds (1 year) */
const VISITOR_ID_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

/**
 * Check if cookie consent has been given
 * @returns true if cookies are accepted
 */
function hasCookieConsent(): boolean {
  if (typeof window === "undefined") {
    return true; // Server-side, assume consent for operations
  }
  return localStorage.getItem("cookie-consent") === "accepted";
}

/**
 * Generate a new unique visitor ID
 *
 * Uses nanoid for short, URL-safe unique IDs.
 * Prefixed with 'v_' for easy identification.
 *
 * @returns A new unique visitor ID
 */
function generateVisitorId(): string {
  return `v_${nanoid(21)}`;
}

/**
 * Get visitor ID from localStorage (client-side only)
 *
 * @returns Visitor ID if found, null otherwise
 */
export function getVisitorIdFromStorage(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(VISITOR_ID_STORAGE_KEY);
}

/**
 * Get visitor ID from cookie (server-side)
 *
 * @returns Visitor ID if found, null otherwise
 */
export async function getVisitorIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const visitorCookie = cookieStore.get(VISITOR_ID_COOKIE_NAME);
  return visitorCookie?.value ?? null;
}

/**
 * Get or create a visitor ID (client-side)
 *
 * Checks localStorage first, then generates a new ID if not found.
 * Stores in both localStorage and cookie for cross-access.
 * Respects cookie consent preferences.
 *
 * @returns The visitor ID (existing or newly generated)
 *
 * @example
 * ```typescript
 * // In a client component
 * const visitorId = getVisitorId();
 * console.log(`Visitor: ${visitorId}`);
 * ```
 */
export function getVisitorId(): string {
  if (typeof window === "undefined") {
    throw new Error("getVisitorId() can only be called on the client side");
  }

  // Check localStorage first
  let visitorId = localStorage.getItem(VISITOR_ID_STORAGE_KEY);

  if (!visitorId) {
    // Generate new visitor ID
    visitorId = generateVisitorId();

    // Store in localStorage (always)
    localStorage.setItem(VISITOR_ID_STORAGE_KEY, visitorId);

    // Store in cookie if consent given
    if (hasCookieConsent()) {
      setVisitorIdCookie(visitorId);
    }
  }

  return visitorId;
}

/**
 * Set visitor ID in localStorage and cookie (client-side)
 *
 * Useful for restoring visitor ID from server or syncing after login.
 * Respects cookie consent preferences.
 *
 * @param id - The visitor ID to set
 *
 * @example
 * ```typescript
 * // Restore visitor ID from server
 * setVisitorId(serverVisitorId);
 * ```
 */
export function setVisitorId(id: string): void {
  if (typeof window === "undefined") {
    throw new Error("setVisitorId() can only be called on the client side");
  }

  // Validate ID format (should start with v_)
  if (!id.startsWith("v_")) {
    throw new Error("Invalid visitor ID format. Must start with 'v_'");
  }

  // Store in localStorage
  localStorage.setItem(VISITOR_ID_STORAGE_KEY, id);

  // Store in cookie if consent given
  if (hasCookieConsent()) {
    setVisitorIdCookie(id);
  }
}

/**
 * Set visitor ID cookie (client-side helper)
 *
 * @param id - The visitor ID to set
 */
function setVisitorIdCookie(id: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const secure = process.env.NODE_ENV === "production";
  const cookieValue = [
    `${VISITOR_ID_COOKIE_NAME}=${id}`,
    `max-age=${VISITOR_ID_COOKIE_MAX_AGE}`,
    "path=/",
    "samesite=lax",
    secure ? "secure" : "",
  ]
    .filter(Boolean)
    .join("; ");

  document.cookie = cookieValue;
}

/**
 * Set visitor ID in cookie (server-side)
 *
 * @param id - The visitor ID to set
 */
export async function setVisitorIdServerCookie(id: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(VISITOR_ID_COOKIE_NAME, id, {
    maxAge: VISITOR_ID_COOKIE_MAX_AGE,
    httpOnly: false, // Need client-side access
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

/**
 * Get or create visitor ID (server-side)
 *
 * Checks cookie first, then generates a new ID if not found.
 * Sets the cookie for future requests.
 *
 * @returns The visitor ID (existing or newly generated)
 *
 * @example
 * ```typescript
 * // In a server action or API route
 * const visitorId = await getOrCreateVisitorIdServer();
 * ```
 */
export async function getOrCreateVisitorIdServer(): Promise<string> {
  let visitorId = await getVisitorIdFromCookie();

  if (!visitorId) {
    visitorId = generateVisitorId();
    await setVisitorIdServerCookie(visitorId);
  }

  return visitorId;
}

/**
 * Clear visitor ID from storage and cookie (client-side)
 *
 * Useful for privacy compliance or testing.
 */
export function clearVisitorId(): void {
  if (typeof window === "undefined") {
    return;
  }

  // Clear localStorage
  localStorage.removeItem(VISITOR_ID_STORAGE_KEY);

  // Clear cookie
  document.cookie = `${VISITOR_ID_COOKIE_NAME}=; max-age=0; path=/`;
}

/**
 * Clear visitor ID cookie (server-side)
 *
 * Useful for privacy compliance requests.
 */
export async function clearVisitorIdCookieServer(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(VISITOR_ID_COOKIE_NAME);
}

/**
 * Sync visitor ID between client and server
 *
 * Call this after confirming cookie consent to ensure
 * the visitor ID is properly stored in the cookie.
 */
export function syncVisitorIdToCookie(): void {
  if (typeof window === "undefined") {
    return;
  }

  const visitorId = localStorage.getItem(VISITOR_ID_STORAGE_KEY);
  if (visitorId && hasCookieConsent()) {
    setVisitorIdCookie(visitorId);
  }
}
