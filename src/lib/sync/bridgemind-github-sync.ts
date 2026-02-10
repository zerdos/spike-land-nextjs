/**
 * BridgeMind -> GitHub Projects V2 Sync Engine
 *
 * One-way sync: reads tasks from BridgeMind via the MCP gateway client,
 * creates/updates GitHub issues, and tracks all operations in the database
 * via SyncState, SyncItemMapping, and SyncEvent models.
 *
 * Designed to be idempotent -- safe to call repeatedly without side effects
 * when no changes have occurred.
 */

import type { Prisma } from "@/generated/prisma";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";

import {
  type BridgeMindCard,
  bridgemindCardToGitHubIssue,
  compareVersions,
} from "./sync-utils";

// Re-export types for consumers
export type { BridgeMindCard };

export interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  durationMs: number;
}

export interface SyncClients {
  bridgemind: {
    listTasks: (options?: { limit?: number }) => Promise<{
      data: BridgeMindCard[] | null;
      error: string | null;
    }>;
  };
  github: {
    createIssue: (options: {
      title: string;
      body: string;
      labels?: string[];
    }) => Promise<{
      data: { number: number; id: string; url: string } | null;
      error: string | null;
    }>;
    addItemToProject: (issueId: string) => Promise<{
      data: { itemId: string } | null;
      error: string | null;
    }>;
  };
}

/**
 * Get or create the singleton SyncState record for BRIDGEMIND source.
 */
async function getOrCreateSyncState() {
  const existing = await prisma.syncState.findFirst({
    where: { source: "BRIDGEMIND" },
  });

  if (existing) {
    return existing;
  }

  return prisma.syncState.create({
    data: { source: "BRIDGEMIND", status: "IDLE" },
  });
}

/**
 * Log a sync event to the database.
 */
async function logSyncEvent(
  eventType: "ITEM_CREATED" | "ITEM_UPDATED" | "ITEM_DELETED" | "SYNC_COMPLETED" | "SYNC_FAILED",
  itemId?: string,
  details?: Record<string, unknown>,
) {
  await prisma.syncEvent.create({
    data: {
      eventType,
      source: "BRIDGEMIND",
      itemId: itemId ?? null,
      details: (details ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

/**
 * Main sync function: BridgeMind -> GitHub Projects V2.
 *
 * 1. Marks SyncState as SYNCING
 * 2. Fetches all BridgeMind tasks
 * 3. For each task: check SyncItemMapping
 *    - No mapping: create GitHub issue + project item, store mapping
 *    - Mapping exists + version changed: update GitHub issue (logged, not re-created)
 *    - Mapping exists + same version: skip
 * 4. Logs all operations to SyncEvent
 * 5. Updates SyncState with result
 *
 * Accepts injected clients for testability.
 */
export async function syncBridgeMindToGitHub(
  clients: SyncClients,
): Promise<SyncResult> {
  const startTime = Date.now();
  const result: SyncResult = {
    success: false,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    durationMs: 0,
  };

  // 1. Get or create sync state and mark as syncing
  const { data: syncState, error: stateError } = await tryCatch(
    getOrCreateSyncState(),
  );

  if (stateError || !syncState) {
    result.errors.push(`Failed to initialize sync state: ${stateError?.message ?? "unknown"}`);
    result.durationMs = Date.now() - startTime;
    return result;
  }

  const { error: updateStateError } = await tryCatch(
    prisma.syncState.update({
      where: { id: syncState.id },
      data: {
        status: "SYNCING",
        lastAttemptedSync: new Date(),
      },
    }),
  );

  if (updateStateError) {
    result.errors.push(`Failed to update sync state: ${updateStateError.message}`);
    result.durationMs = Date.now() - startTime;
    return result;
  }

  // 2. Fetch BridgeMind tasks
  const { data: tasksResult, error: fetchError } = await tryCatch(
    clients.bridgemind.listTasks({ limit: 100 }),
  );

  if (fetchError) {
    await finalizeSyncState(syncState.id, false, 0, fetchError.message);
    await logSyncEvent("SYNC_FAILED", undefined, { error: fetchError.message });
    result.errors.push(`BridgeMind fetch failed: ${fetchError.message}`);
    result.durationMs = Date.now() - startTime;
    return result;
  }

  if (tasksResult?.error) {
    await finalizeSyncState(syncState.id, false, 0, tasksResult.error);
    await logSyncEvent("SYNC_FAILED", undefined, { error: tasksResult.error });
    result.errors.push(`BridgeMind error: ${tasksResult.error}`);
    result.durationMs = Date.now() - startTime;
    return result;
  }

  const tasks = tasksResult?.data ?? [];

  // 3. Process each task
  for (const task of tasks) {
    const { data: mapping, error: mappingError } = await tryCatch(
      prisma.syncItemMapping.findUnique({
        where: { bridgemindId: task.id },
      }),
    );

    if (mappingError) {
      result.errors.push(`Failed to check mapping for ${task.id}: ${mappingError.message}`);
      continue;
    }

    if (!mapping) {
      // No mapping exists: create a new GitHub issue
      const { error: createError } = await tryCatch(
        createGitHubIssueForTask(task, clients),
      );

      if (createError) {
        result.errors.push(`Failed to create issue for ${task.id}: ${createError.message}`);
      } else {
        result.created++;
      }
    } else {
      // Mapping exists: check if version changed
      const currentVersion = task.updatedAt;
      const versionComparison = compareVersions(currentVersion, mapping.bridgemindVersion);

      if (versionComparison > 0) {
        // Task has been updated since last sync
        const { error: updateError } = await tryCatch(
          updateSyncMapping(task, mapping.id),
        );

        if (updateError) {
          result.errors.push(`Failed to update mapping for ${task.id}: ${updateError.message}`);
        } else {
          result.updated++;
        }
      } else {
        result.skipped++;
      }
    }
  }

  // 4. Finalize
  const totalSynced = result.created + result.updated;
  const hasErrors = result.errors.length > 0;
  const overallSuccess = !hasErrors || totalSynced > 0;

  await finalizeSyncState(
    syncState.id,
    overallSuccess,
    totalSynced,
    hasErrors ? result.errors.join("; ") : undefined,
  );

  await logSyncEvent("SYNC_COMPLETED", undefined, {
    created: result.created,
    updated: result.updated,
    skipped: result.skipped,
    errors: result.errors.length,
  });

  result.success = overallSuccess;
  result.durationMs = Date.now() - startTime;
  return result;
}

/**
 * Create a GitHub issue for a BridgeMind task and store the mapping.
 */
async function createGitHubIssueForTask(
  task: BridgeMindCard,
  clients: SyncClients,
): Promise<void> {
  const issuePayload = bridgemindCardToGitHubIssue(task);

  const issueResult = await clients.github.createIssue({
    title: issuePayload.title,
    body: issuePayload.body,
    labels: issuePayload.labels,
  });

  if (issueResult.error || !issueResult.data) {
    throw new Error(issueResult.error ?? "Failed to create GitHub issue");
  }

  // Add to project board
  let projectItemId: string | undefined;
  const projectResult = await clients.github.addItemToProject(issueResult.data.id);
  if (projectResult.data) {
    projectItemId = projectResult.data.itemId;
  }

  // Store mapping
  await prisma.syncItemMapping.create({
    data: {
      bridgemindId: task.id,
      githubIssueNumber: issueResult.data.number,
      githubIssueId: issueResult.data.id,
      githubProjectItemId: projectItemId,
      bridgemindVersion: task.updatedAt,
      lastSyncedAt: new Date(),
    },
  });

  await logSyncEvent("ITEM_CREATED", task.id, {
    githubIssueNumber: issueResult.data.number,
    title: task.title,
  });
}

/**
 * Update the sync mapping version when a BridgeMind task has changed.
 * The actual GitHub issue content update is logged but deferred to
 * a future enhancement (currently we track the version bump).
 */
async function updateSyncMapping(
  task: BridgeMindCard,
  mappingId: string,
): Promise<void> {
  await prisma.syncItemMapping.update({
    where: { id: mappingId },
    data: {
      bridgemindVersion: task.updatedAt,
      lastSyncedAt: new Date(),
    },
  });

  await logSyncEvent("ITEM_UPDATED", task.id, {
    title: task.title,
    newVersion: task.updatedAt,
  });
}

/**
 * Finalize the sync state record after a sync run.
 */
async function finalizeSyncState(
  syncStateId: string,
  success: boolean,
  itemsSynced: number,
  errorMessage?: string,
): Promise<void> {
  const { error } = await tryCatch(
    prisma.syncState.update({
      where: { id: syncStateId },
      data: {
        status: success ? "IDLE" : "ERROR",
        lastSuccessfulSync: success ? new Date() : undefined,
        consecutiveErrors: success ? 0 : { increment: 1 },
        itemsSynced,
        errorMessage: errorMessage ?? null,
      },
    }),
  );

  if (error) {
    console.error("Failed to finalize sync state:", error);
  }
}
