/**
 * App Factory Storage Abstraction
 *
 * Provides a unified storage interface that works across environments:
 * - Local development: Uses file system (when APP_FACTORY_PATH is set)
 * - Vercel/Production: Uses Upstash Redis
 *
 * This allows the app factory to work seamlessly in serverless environments
 * where persistent file storage is not available.
 */

import type { AppState, HistoryEntry } from "@/types/app-factory";
import * as fs from "fs";
import * as path from "path";
import { redis } from "../upstash/client";

// Storage configuration
const APP_FACTORY_PATH = process.env["APP_FACTORY_PATH"] || "";
const USE_FILE_STORAGE = !!APP_FACTORY_PATH;

// File paths (only used when APP_FACTORY_PATH is set)
const STATE_FILE = APP_FACTORY_PATH
  ? path.join(APP_FACTORY_PATH, ".state/apps.json")
  : "";
const HISTORY_DIR = APP_FACTORY_PATH
  ? path.join(APP_FACTORY_PATH, ".state/history")
  : "";

// Redis keys for app factory state
const REDIS_KEYS = {
  STATE: "app-factory:state",
  HISTORY: (appName: string) => `app-factory:history:${appName}`,
  ALL_HISTORY: "app-factory:history:*",
} as const;

/** Prototype pollution keys that must be blocked */
const PROTOTYPE_POLLUTION_KEYS = ["__proto__", "constructor", "prototype"];

/**
 * Validate app name to prevent prototype pollution and path traversal
 */
export function isValidAppName(name: unknown): name is string {
  if (typeof name !== "string") return false;
  if (name.length === 0 || name.length > 100) return false;
  if (!/^[a-z0-9-]+$/.test(name)) return false;
  if (PROTOTYPE_POLLUTION_KEYS.includes(name)) return false;
  return true;
}

/**
 * State file structure
 */
export interface StateFile {
  apps: Record<string, AppState>;
  lastUpdated: string;
}

/**
 * Storage backend interface
 */
interface StorageBackend {
  loadState(): Promise<StateFile | null>;
  saveState(state: StateFile): Promise<void>;
  logHistory(
    appName: string,
    entry: HistoryEntry,
  ): Promise<void>;
  loadRecentHistory(limit?: number): Promise<HistoryEntry[]>;
  getStorageType(): "file" | "redis";
}

/**
 * File system storage backend (for local development)
 */
class FileStorageBackend implements StorageBackend {
  loadState(): Promise<StateFile | null> {
    if (!STATE_FILE) {
      console.error("STATE_FILE not configured");
      return Promise.resolve(null);
    }
    if (!fs.existsSync(STATE_FILE)) {
      return Promise.resolve(null);
    }
    const content = fs.readFileSync(STATE_FILE, "utf-8");
    return Promise.resolve(JSON.parse(content));
  }

  saveState(state: StateFile): Promise<void> {
    if (!STATE_FILE) {
      console.error("STATE_FILE not configured");
      return Promise.resolve();
    }
    // Ensure directory exists
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    return Promise.resolve();
  }

  logHistory(appName: string, entry: HistoryEntry): Promise<void> {
    if (!isValidAppName(appName)) {
      console.error(`Invalid app name for logging: ${appName}`);
      return Promise.resolve();
    }
    if (!HISTORY_DIR) {
      console.error("HISTORY_DIR not configured");
      return Promise.resolve();
    }
    fs.mkdirSync(HISTORY_DIR, { recursive: true });
    const logFile = path.join(HISTORY_DIR, `${appName}.log`);
    fs.appendFileSync(logFile, JSON.stringify(entry) + "\n");
    return Promise.resolve();
  }

  loadRecentHistory(limit: number = 50): Promise<HistoryEntry[]> {
    if (!HISTORY_DIR || !fs.existsSync(HISTORY_DIR)) {
      return Promise.resolve([]);
    }

    const entries: HistoryEntry[] = [];
    const files = fs.readdirSync(HISTORY_DIR);

    for (const file of files) {
      if (!file.endsWith(".log")) continue;
      const filePath = path.join(HISTORY_DIR, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);

      for (const line of lines) {
        try {
          entries.push(JSON.parse(line));
        } catch {
          // Skip malformed entries
        }
      }
    }

    return Promise.resolve(
      entries
        .sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )
        .slice(0, limit),
    );
  }

  getStorageType(): "file" {
    return "file";
  }
}

/**
 * Redis storage backend (for Vercel/serverless)
 */
class RedisStorageBackend implements StorageBackend {
  async loadState(): Promise<StateFile | null> {
    try {
      const state = await redis.get<StateFile>(REDIS_KEYS.STATE);
      return state;
    } catch (error) {
      console.error("Failed to load state from Redis:", error);
      return null;
    }
  }

  async saveState(state: StateFile): Promise<void> {
    try {
      state.lastUpdated = new Date().toISOString();
      await redis.set(REDIS_KEYS.STATE, state);
    } catch (error) {
      console.error("Failed to save state to Redis:", error);
    }
  }

  async logHistory(appName: string, entry: HistoryEntry): Promise<void> {
    if (!isValidAppName(appName)) {
      console.error(`Invalid app name for logging: ${appName}`);
      return;
    }
    try {
      // Store history as a list, newest first
      // Keep last 1000 entries per app to avoid unbounded growth
      await redis.lpush(REDIS_KEYS.HISTORY(appName), JSON.stringify(entry));
      await redis.ltrim(REDIS_KEYS.HISTORY(appName), 0, 999);
    } catch (error) {
      console.error("Failed to log history to Redis:", error);
    }
  }

  async loadRecentHistory(limit: number = 50): Promise<HistoryEntry[]> {
    try {
      // Get all history keys
      const keys = await redis.keys(REDIS_KEYS.ALL_HISTORY);
      if (!keys || keys.length === 0) {
        return [];
      }

      const entries: HistoryEntry[] = [];

      // Fetch history from each app (limit per app to avoid large fetches)
      for (const key of keys) {
        const appHistory = await redis.lrange<string>(key, 0, limit - 1);
        if (appHistory) {
          for (const item of appHistory) {
            try {
              const entry = typeof item === "string" ? JSON.parse(item) : item;
              entries.push(entry);
            } catch {
              // Skip malformed entries
            }
          }
        }
      }

      // Sort by timestamp and return limited results
      return entries
        .sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )
        .slice(0, limit);
    } catch (error) {
      console.error("Failed to load history from Redis:", error);
      return [];
    }
  }

  getStorageType(): "redis" {
    return "redis";
  }
}

// Select storage backend based on environment
const storage: StorageBackend = USE_FILE_STORAGE
  ? new FileStorageBackend()
  : new RedisStorageBackend();

/**
 * Get the current storage type being used
 */
export function getStorageType(): "file" | "redis" {
  return storage.getStorageType();
}

/**
 * Load app factory state
 */
export function loadState(): Promise<StateFile | null> {
  return storage.loadState();
}

/**
 * Save app factory state
 */
export function saveState(state: StateFile): Promise<void> {
  return storage.saveState(state);
}

/**
 * Log a history entry for an app
 */
export function logHistory(
  appName: string,
  event: HistoryEntry["event"],
  details: Partial<HistoryEntry>,
): Promise<void> {
  const entry: HistoryEntry = {
    timestamp: new Date().toISOString(),
    appName,
    event,
    ...details,
  };
  return storage.logHistory(appName, entry);
}

/**
 * Load recent history entries
 */
export function loadRecentHistory(limit?: number): Promise<HistoryEntry[]> {
  return storage.loadRecentHistory(limit);
}

// Log which storage backend is being used on module load
console.log(
  `[App Factory Storage] Using ${storage.getStorageType()} storage backend`,
);
