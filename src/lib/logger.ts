// src/lib/logger.ts

// A simple logger implementation for now.
// In a real application, this would be a more robust logger like Winston or Pino.

export const logger = {
  info: (...args: any[]) => {
    console.log('[INFO]', ...args);
  },
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },
};
