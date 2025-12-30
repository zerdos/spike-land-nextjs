export const CONSENT_KEY = "cookie-consent";

/**
 * Check if user has given cookie consent
 */
export function hasConsent(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CONSENT_KEY) === "accepted";
}
