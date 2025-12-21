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
let pendingEvents: TryCatchEvent[] = [];
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

// Batch interval (5 seconds as per requirements)
const FRONTEND_BATCH_INTERVAL = 5000;

// Max events per batch to prevent large payloads
const MAX_BATCH_SIZE = 100;

/**
 * Records a frontend try-catch event.
 * This function is non-blocking and returns immediately.
 *
 * @param success - Whether the operation succeeded or failed
 */
export function recordFrontendTryCatchEvent(success: boolean): void {
  pendingEvents.push({ success });

  // Flush immediately if batch is full
  if (pendingEvents.length >= MAX_BATCH_SIZE) {
    void syncEventsToBackend();
    return;
  }

  // Otherwise, schedule sync
  if (!syncTimeout) {
    syncTimeout = setTimeout(() => {
      void syncEventsToBackend();
      syncTimeout = null;
    }, FRONTEND_BATCH_INTERVAL);
  }
}

/**
 * Syncs batched events to backend.
 */
async function syncEventsToBackend(): Promise<void> {
  if (pendingEvents.length === 0) return;

  // Atomic swap - capture and clear in one operation
  // This prevents race conditions since JS is single-threaded
  const events = pendingEvents;
  pendingEvents = [];

  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }

  try {
    await fetch("/api/observability/try-catch-stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
    });
  } catch (error) {
    // Silently fail - don't cause more errors
    console.error("[TryCatchStats] Failed to sync events:", error);
  }
}

/**
 * Forces an immediate sync of pending events.
 * Useful before page navigation.
 */
export async function flushFrontendStats(): Promise<void> {
  await syncEventsToBackend();
}

/**
 * Gets the number of pending events (for testing/monitoring).
 */
export function getPendingEventsCount(): number {
  return pendingEvents.length;
}

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
