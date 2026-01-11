/**
 * Delays execution for a specified number of milliseconds.
 * @param ms The number of milliseconds to wait.
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Options for the retry utility.
 */
interface RetryOptions {
  /** The maximum number of attempts. */
  retries: number;
  /** The delay between retries in milliseconds. */
  delay: number;
}

/**
 * A utility function to retry an async operation.
 *
 * @param fn The async function to execute.
 * @param options The retry options.
 * @returns The result of the async function.
 * @throws An error if all retries fail.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = { retries: 3, delay: 1000 },
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < options.retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < options.retries - 1) {
        await delay(options.delay);
      }
    }
  }

  throw lastError;
}
