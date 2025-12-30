export const CONSENT_KEY = "cookie-consent";
export const CONSENT_CHANGED_EVENT = "consent-changed";

/**
 * Check if user has given cookie consent
 */
export function hasConsent(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CONSENT_KEY) === "accepted";
}

/**
 * Notify components that consent has changed (for same-tab reactivity)
 * Call this after updating localStorage with consent value
 */
export function notifyConsentChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT));
}
