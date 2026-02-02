/**
 * Vibe Watcher - Auto-sync local live/*.tsx files to testing.spike.land
 *
 * This module watches the live/ directory for file changes and automatically
 * syncs them to testing.spike.land, triggering iframe reloads in /my-apps pages.
 *
 * Architecture:
 * - Uses chokidar to watch live/*.tsx files
 * - Debounces changes (200ms) to prevent flooding
 * - Calls pushCode() to sync entire file to testing.spike.land
 * - Notifies SSE clients via the sync-status API for iframe reloads
 */

import prisma from "@/lib/prisma";
import chokidar, { type FSWatcher } from "chokidar";
import { existsSync, mkdirSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { basename, join } from "path";

const LIVE_DIR = join(process.cwd(), "live");
const DEBOUNCE_MS = 200;
const BASE_URL = process.env["NEXTAUTH_URL"] || "http://localhost:3000";
const TESTING_SPIKE_LAND_URL = process.env["TESTING_SPIKE_LAND_URL"] ||
  "https://testing.spike.land";

let watcher: FSWatcher | null = null;
const debounceTimers = new Map<string, NodeJS.Timeout>();
const appIdCache = new Map<string, string | null>();

/**
 * Push code to testing.spike.land
 */
async function pushCode(codespaceId: string, code: string, run = true): Promise<void> {
  const url = `${TESTING_SPIKE_LAND_URL}/live/${codespaceId}/api/code`;

  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, run }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to push code: HTTP ${response.status} - ${errorText}`);
  }
}

/**
 * Download code from testing.spike.land
 */
async function pullCode(codespaceId: string): Promise<string> {
  const url = `${TESTING_SPIKE_LAND_URL}/live/${codespaceId}/session.json`;

  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      return createPlaceholder(codespaceId);
    }
    throw new Error(`Failed to fetch code: HTTP ${response.status}`);
  }

  const session = (await response.json()) as { code?: string; cSess?: { code?: string; }; };
  return session.code || session.cSess?.code || "";
}

/**
 * Create placeholder code for a new codespace
 */
function createPlaceholder(codespaceId: string): string {
  return `// New codespace: ${codespaceId}
// Edit this file and changes will sync automatically

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Hello from ${codespaceId}
        </h1>
        <p className="text-gray-600">
          Start editing to see live changes
        </p>
      </div>
    </div>
  );
}
`;
}

/**
 * Start watching live/*.tsx files for changes
 */
export function startVibeWatcher(): void {
  if (watcher) return;

  // Ensure live directory exists
  if (!existsSync(LIVE_DIR)) {
    mkdirSync(LIVE_DIR, { recursive: true });
  }

  console.log("🎸 Vibe watcher started - watching live/*.tsx");

  watcher = chokidar.watch(join(LIVE_DIR, "*.tsx"), {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 20,
    },
  });

  watcher.on("change", handleFileChange);
  watcher.on("add", handleFileChange);
  watcher.on("error", (error) => {
    console.error("❌ Vibe watcher error:", error);
  });
}

/**
 * Handle a file change event with debouncing
 */
function handleFileChange(filePath: string): void {
  const filename = basename(filePath);
  const codespaceId = filename.replace(".tsx", "");

  // Clear existing debounce timer
  const existingTimer = debounceTimers.get(codespaceId);
  if (existingTimer) clearTimeout(existingTimer);

  // Debounce the sync
  debounceTimers.set(
    codespaceId,
    setTimeout(() => {
      void syncFile(codespaceId, filePath);
    }, DEBOUNCE_MS),
  );
}

/**
 * Sync a file to testing.spike.land and notify SSE clients
 */
async function syncFile(codespaceId: string, filePath: string): Promise<void> {
  const appId = await resolveAppId(codespaceId);

  // Notify sync started
  if (appId) {
    await notifySyncStatus(appId, true);
  }

  try {
    const code = await readFile(filePath, "utf-8");
    await pushCode(codespaceId, code, true);
    console.log(`✅ Synced ${codespaceId} (${code.length} bytes)`);

    // Notify code updated
    if (appId) {
      await notifySyncStatus(appId, false, true);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ Sync failed for ${codespaceId}: ${message}`);
    if (appId) {
      await notifySyncStatus(appId, false);
    }
  }
}

/**
 * Look up appId from codespaceId using the database
 */
async function resolveAppId(codespaceId: string): Promise<string | null> {
  if (appIdCache.has(codespaceId)) {
    return appIdCache.get(codespaceId)!;
  }

  try {
    const app = await prisma.app.findFirst({
      where: { codespaceId, deletedAt: null },
      select: { id: true },
    });

    const appId = app?.id ?? null;
    appIdCache.set(codespaceId, appId);
    return appId;
  } catch {
    // Database might not be available in all environments
    return null;
  }
}

/**
 * Notify the sync-status SSE endpoint
 */
async function notifySyncStatus(
  appId: string,
  isSyncing: boolean,
  codeUpdated = false,
): Promise<void> {
  try {
    await fetch(`${BASE_URL}/api/apps/${appId}/sync-status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": process.env["INTERNAL_API_KEY"] || "",
      },
      body: JSON.stringify({ isSyncing, codeUpdated }),
    });
  } catch {
    // Silently fail - SSE notification is not critical
  }
}

/**
 * Ensure a local file exists for a codespace, downloading if necessary
 */
export async function ensureLocalFile(codespaceId: string): Promise<string> {
  // Ensure live directory exists
  if (!existsSync(LIVE_DIR)) {
    mkdirSync(LIVE_DIR, { recursive: true });
  }

  const filePath = join(LIVE_DIR, `${codespaceId}.tsx`);

  if (existsSync(filePath)) {
    return filePath;
  }

  // Download from server
  const code = await pullCode(codespaceId);
  await writeFile(filePath, code, "utf-8");

  // Write metadata
  const metaPath = join(LIVE_DIR, `${codespaceId}.meta.json`);
  await writeFile(
    metaPath,
    JSON.stringify(
      {
        codespaceId,
        syncedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf-8",
  );

  console.log(`📥 Downloaded ${codespaceId} → ${filePath} (${code.length} bytes)`);

  return filePath;
}

/**
 * Stop the vibe watcher and clean up resources
 */
export function stopVibeWatcher(): void {
  if (watcher) {
    void watcher.close();
    watcher = null;
  }
  debounceTimers.forEach(clearTimeout);
  debounceTimers.clear();
  appIdCache.clear();
  console.log("🛑 Vibe watcher stopped");
}

/**
 * Clear the appId cache (useful when apps are created/deleted)
 */
export function clearAppIdCache(): void {
  appIdCache.clear();
}
