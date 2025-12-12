/**
 * Enhancement timeout configuration
 *
 * Vercel Pro plan supports up to 300s (5 minutes) function timeout.
 * This allows sufficient time for:
 * - Gemini API call (up to 120s for 4K images)
 * - Image processing and upload
 * - Database operations
 */

export const ENHANCEMENT_TIMEOUT_SECONDS = parseInt(
  process.env.ENHANCEMENT_TIMEOUT_SECONDS || "300",
  10,
);

// Validate timeout is within Vercel limits
if (ENHANCEMENT_TIMEOUT_SECONDS > 300) {
  console.warn(
    `ENHANCEMENT_TIMEOUT_SECONDS (${ENHANCEMENT_TIMEOUT_SECONDS}) exceeds Vercel Pro limit (300s). Capping at 300s.`,
  );
}

export const maxDuration = Math.min(ENHANCEMENT_TIMEOUT_SECONDS, 300);
