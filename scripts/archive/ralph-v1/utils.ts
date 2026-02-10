/**
 * Ralph Shared Utilities
 * Common utility functions for the Jules workforce automation
 */

// ============================================================================
// Input Validation
// ============================================================================

/**
 * Validate GitHub repository format (owner/repo)
 * Prevents command injection via malformed repo names
 */
export function validateRepoFormat(repo: string): boolean {
  // Valid format: alphanumeric, hyphens, underscores, dots for owner/repo
  return /^[\w-]+\/[\w.-]+$/.test(repo);
}

/**
 * Validate issue number is a positive integer
 * Prevents injection via issueNumber parameter
 */
export function validateIssueNumber(issueNumber: number): boolean {
  return Number.isInteger(issueNumber) && issueNumber > 0 && issueNumber < 1000000;
}

/**
 * Validate that a string contains only numeric issue numbers
 * Used for filtering exclude lists before shell commands
 */
export function isNumericIssue(issue: string): boolean {
  return /^\d+$/.test(issue.trim());
}

// ============================================================================
// Shell Escaping
// ============================================================================

/**
 * Escape a string for safe use in shell commands
 * Handles common injection vectors including newlines
 *
 * IMPORTANT: Where possible, prefer using spawnSync with stdin
 * instead of interpolating user input into shell commands.
 * This function is a fallback for cases where that's not possible.
 */
export function escapeForShell(str: string): string {
  return str
    .replace(/\\/g, "\\\\") // Backslashes first
    .replace(/"/g, '\\"') // Double quotes
    .replace(/'/g, "'\\''") // Single quotes (end quote, escaped quote, start quote)
    .replace(/\$/g, "\\$") // Dollar signs (prevent variable expansion)
    .replace(/`/g, "\\`") // Backticks (prevent command substitution)
    .replace(/!/g, "\\!") // Exclamation marks (history expansion)
    .replace(/;/g, "\\;") // Semicolons (command separator)
    .replace(/\n/g, "\\n") // Newlines
    .replace(/\r/g, "\\r") // Carriage returns
    .replace(/\t/g, "\\t"); // Tabs
}

/**
 * Escape a string for safe use as a command argument
 * Less aggressive than escapeForShell - only handles special characters
 */
export function escapeArgument(arg: string): string {
  // If the argument contains no special characters, return as-is
  if (/^[\w./-]+$/.test(arg)) {
    return arg;
  }

  // Wrap in single quotes and escape any single quotes within
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

// ============================================================================
// Date/Time Utilities
// ============================================================================

/**
 * Get ISO timestamp for current time
 */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Check if a timestamp is older than the specified hours
 */
export function isOlderThanHours(timestamp: string, hours: number): boolean {
  const date = new Date(timestamp);
  const now = new Date();
  const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  return diffHours > hours;
}

// ============================================================================
// Array Utilities
// ============================================================================

/**
 * Safely get an element from an array with type safety
 */
export function safeArrayGet<T>(arr: T[], index: number): T | undefined {
  if (index < 0 || index >= arr.length) {
    return undefined;
  }
  return arr[index];
}

// ============================================================================
// Async Utilities
// ============================================================================

/**
 * Sleep for the specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
