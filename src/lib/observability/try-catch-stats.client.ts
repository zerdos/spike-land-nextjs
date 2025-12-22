/**
 * Try-Catch Stats Client Collector
 *
 * Collects frontend try-catch statistics and syncs them
 * to the backend in batches (5 second intervals).
 *
 * This module is frontend-only (no server-side imports).
 */

interface TryCatchEvent {
  success: boolean;
}

// In-memory buffer for pending events
const pendingEvents: TryCatchEvent[] = [];

// Flush on page unload using sendBeacon for reliability
if (
  typeof window !== "undefined" &&
  typeof window.addEventListener === "function"
) {
  window.addEventListener("beforeunload", () => {
    if (pendingEvents.length > 0) {
      // Use sendBeacon with Blob for reliable delivery on page unload
      // Blob sets Content-Type to application/json for proper server parsing
      navigator.sendBeacon(
        "/api/observability/try-catch-stats",
        new Blob([JSON.stringify({ events: pendingEvents })], { type: "application/json" }),
      );
    }
  });
}

// Export empty object to make this a valid module
export {};
