import { Resend } from "resend";

// Lazy initialization to avoid build-time errors
let resendClient: Resend | null = null;

export function getResend(): Resend {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const RATE_LIMIT_WARNING_THRESHOLD = 80; // Warn at 80% of limit
const RATE_LIMIT_MAX = 100; // Block at 100 emails/day (free tier)

// In-memory rate limiting store
interface RateLimitState {
  count: number;
  windowStart: number;
}

let rateLimitState: RateLimitState = {
  count: 0,
  windowStart: Date.now(),
};

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000; // 1 second

// Email validation regex (RFC 5322 simplified)
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  react: React.ReactElement;
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
  rateLimitWarning?: boolean;
  retriesUsed?: number;
}

/**
 * Validate email format
 * @param email Email address to validate
 * @returns true if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Check and update rate limit
 * @returns Object with allowed status and warning flag
 */
function checkRateLimit(): { allowed: boolean; warning: boolean; remaining: number; } {
  const now = Date.now();

  // Reset window if expired
  if (now - rateLimitState.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimitState = {
      count: 0,
      windowStart: now,
    };
  }

  const remaining = RATE_LIMIT_MAX - rateLimitState.count;
  const warning = rateLimitState.count >= RATE_LIMIT_WARNING_THRESHOLD;
  const allowed = rateLimitState.count < RATE_LIMIT_MAX;

  return { allowed, warning, remaining };
}

/**
 * Increment rate limit counter
 */
function incrementRateLimit(): void {
  rateLimitState.count++;
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get rate limit status (for monitoring)
 */
export function getRateLimitStatus(): { count: number; remaining: number; resetIn: number; } {
  const now = Date.now();
  const resetIn = Math.max(0, RATE_LIMIT_WINDOW_MS - (now - rateLimitState.windowStart));
  const remaining = Math.max(0, RATE_LIMIT_MAX - rateLimitState.count);

  return {
    count: rateLimitState.count,
    remaining,
    resetIn,
  };
}

/**
 * Reset rate limit state (for testing)
 */
export function resetRateLimitState(): void {
  rateLimitState = {
    count: 0,
    windowStart: Date.now(),
  };
}

/**
 * Set rate limit count (for testing)
 */
export function setRateLimitCount(count: number): void {
  rateLimitState.count = count;
}

/**
 * Send an email using Resend with retry logic and rate limiting
 *
 * Features:
 * - Email format validation
 * - Exponential backoff retry (3 attempts)
 * - In-memory rate limiting (100/day)
 * - Rate limit warnings at 80% threshold
 *
 * Rate limiting considerations:
 * - Free tier: 100 emails/day
 * - Paid tier: Higher limits based on plan
 *
 * @param params Email parameters
 * @returns Result with success status and email ID or error
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  // Validate email format
  const recipients = Array.isArray(params.to) ? params.to : [params.to];
  for (const email of recipients) {
    if (!isValidEmail(email)) {
      return {
        success: false,
        error: `Invalid email format: ${email}`,
      };
    }
  }

  // Check rate limit
  const rateLimit = checkRateLimit();
  if (!rateLimit.allowed) {
    console.error("[Email] Rate limit exceeded. Remaining quota:", rateLimit.remaining);
    return {
      success: false,
      error: "Daily email limit exceeded. Please try again later.",
    };
  }

  if (rateLimit.warning) {
    console.warn(
      "[Email] Rate limit warning: approaching daily limit. Remaining:",
      rateLimit.remaining,
    );
  }

  let lastError: string | undefined;
  let retriesUsed = 0;

  // Retry loop with exponential backoff
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const resend = getResend();
      const from = params.from || process.env.EMAIL_FROM || "noreply@spike.land";

      const result = await resend.emails.send({
        from,
        to: params.to,
        subject: params.subject,
        react: params.react,
      });

      if (result.error) {
        lastError = result.error.message;

        // Don't retry on validation errors
        if (
          result.error.message?.includes("validation") ||
          result.error.message?.includes("invalid")
        ) {
          return {
            success: false,
            error: lastError,
            retriesUsed,
          };
        }

        // Retry on other errors
        if (attempt < MAX_RETRIES - 1) {
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
          console.warn(`[Email] Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, lastError);
          await sleep(delay);
          retriesUsed++;
          continue;
        }
      }

      if (result.data && result.data.id) {
        // Increment rate limit counter on success
        incrementRateLimit();

        return {
          success: true,
          id: result.data.id,
          rateLimitWarning: rateLimit.warning,
          retriesUsed,
        };
      }

      lastError = "Failed to send email - no ID returned";
      if (attempt < MAX_RETRIES - 1) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
        await sleep(delay);
        retriesUsed++;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown error";

      // Don't retry on configuration errors
      if (lastError.includes("RESEND_API_KEY") || lastError.includes("configured")) {
        return {
          success: false,
          error: lastError,
          retriesUsed,
        };
      }

      if (attempt < MAX_RETRIES - 1) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[Email] Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, lastError);
        await sleep(delay);
        retriesUsed++;
      }
    }
  }

  return {
    success: false,
    error: lastError || "Failed after all retry attempts",
    retriesUsed,
  };
}
