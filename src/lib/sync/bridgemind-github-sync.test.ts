import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SyncClients } from "./bridgemind-github-sync";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    syncState: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    syncItemMapping: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    syncEvent: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/try-catch", () => ({
  tryCatch: vi.fn(async (promise: Promise<unknown>) => {
    try {
      const data = await promise;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }),
}));

const prisma = (await import("@/lib/prisma")).default;
const { syncBridgeMindToGitHub } = await import("./bridgemind-github-sync");

function createMockClients(overrides?: Partial<SyncClients>): SyncClients {
  return {
    bridgemind: {
      listTasks: vi.fn().mockResolvedValue({ data: [], error: null }),
      ...overrides?.bridgemind,
    },
    github: {
      createIssue: vi.fn().mockResolvedValue({
        data: { number: 1, id: "issue-id-1", url: "https://github.com/test/1" },
        error: null,
      }),
      addItemToProject: vi.fn().mockResolvedValue({
        data: { itemId: "project-item-1" },
        error: null,
      }),
      ...overrides?.github,
    },
  };
}

const SYNC_STATE_FIXTURE = {
  id: "sync-state-1",
  source: "BRIDGEMIND" as const,
  status: "IDLE" as const,
  lastSuccessfulSync: null,
  lastAttemptedSync: null,
  consecutiveErrors: 0,
  syncCursor: null,
  itemsSynced: 0,
  errorMessage: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const TASK_FIXTURE = {
  id: "bm-task-1",
  title: "Implement feature X",
  description: "Detailed description of feature X",
  status: "todo",
  priority: "high",
  createdAt: "2025-01-10T10:00:00Z",
  updatedAt: "2025-01-15T14:00:00Z",
};

describe("syncBridgeMindToGitHub", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.syncState.findFirst).mockResolvedValue(SYNC_STATE_FIXTURE);
    vi.mocked(prisma.syncState.update).mockResolvedValue(SYNC_STATE_FIXTURE);
    vi.mocked(prisma.syncEvent.create).mockResolvedValue({
      id: "event-1",
      eventType: "SYNC_COMPLETED",
      source: "BRIDGEMIND",
      itemId: null,
      details: null,
      createdAt: new Date(),
    });
  });

  it("should return success when there are no tasks", async () => {
    const clients = createMockClients();

    const result = await syncBridgeMindToGitHub(clients);

    expect(result.success).toBe(true);
    expect(result.created).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("should create sync state if none exists", async () => {
    vi.mocked(prisma.syncState.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.syncState.create).mockResolvedValue(SYNC_STATE_FIXTURE);

    const clients = createMockClients();
    await syncBridgeMindToGitHub(clients);

    expect(prisma.syncState.create).toHaveBeenCalledWith({
      data: { source: "BRIDGEMIND", status: "IDLE" },
    });
  });

  it("should create GitHub issues for new BridgeMind tasks", async () => {
    vi.mocked(prisma.syncItemMapping.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.syncItemMapping.create).mockResolvedValue({
      id: "mapping-1",
      bridgemindId: "bm-task-1",
      githubIssueNumber: 1,
      githubIssueId: "issue-id-1",
      githubProjectItemId: "project-item-1",
      bridgemindVersion: "2025-01-15T14:00:00Z",
      lastSyncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const clients = createMockClients({
      bridgemind: {
        listTasks: vi.fn().mockResolvedValue({
          data: [TASK_FIXTURE],
          error: null,
        }),
      },
    });

    const result = await syncBridgeMindToGitHub(clients);

    expect(result.success).toBe(true);
    expect(result.created).toBe(1);
    expect(result.updated).toBe(0);
    expect(clients.github.createIssue).toHaveBeenCalledTimes(1);
    expect(clients.github.addItemToProject).toHaveBeenCalledWith("issue-id-1");
    expect(prisma.syncItemMapping.create).toHaveBeenCalledTimes(1);
  });

  it("should skip tasks that already have mappings with same version", async () => {
    vi.mocked(prisma.syncItemMapping.findUnique).mockResolvedValue({
      id: "mapping-1",
      bridgemindId: "bm-task-1",
      githubIssueNumber: 1,
      githubIssueId: "issue-id-1",
      githubProjectItemId: "project-item-1",
      bridgemindVersion: "2025-01-15T14:00:00Z", // same as task.updatedAt
      lastSyncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const clients = createMockClients({
      bridgemind: {
        listTasks: vi.fn().mockResolvedValue({
          data: [TASK_FIXTURE],
          error: null,
        }),
      },
    });

    const result = await syncBridgeMindToGitHub(clients);

    expect(result.success).toBe(true);
    expect(result.created).toBe(0);
    expect(result.skipped).toBe(1);
    expect(clients.github.createIssue).not.toHaveBeenCalled();
  });

  it("should update mapping when BridgeMind task version is newer", async () => {
    vi.mocked(prisma.syncItemMapping.findUnique).mockResolvedValue({
      id: "mapping-1",
      bridgemindId: "bm-task-1",
      githubIssueNumber: 1,
      githubIssueId: "issue-id-1",
      githubProjectItemId: "project-item-1",
      bridgemindVersion: "2025-01-10T10:00:00Z", // older than task.updatedAt
      lastSyncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(prisma.syncItemMapping.update).mockResolvedValue({
      id: "mapping-1",
      bridgemindId: "bm-task-1",
      githubIssueNumber: 1,
      githubIssueId: "issue-id-1",
      githubProjectItemId: "project-item-1",
      bridgemindVersion: "2025-01-15T14:00:00Z",
      lastSyncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const clients = createMockClients({
      bridgemind: {
        listTasks: vi.fn().mockResolvedValue({
          data: [TASK_FIXTURE],
          error: null,
        }),
      },
    });

    const result = await syncBridgeMindToGitHub(clients);

    expect(result.success).toBe(true);
    expect(result.updated).toBe(1);
    expect(result.created).toBe(0);
    expect(prisma.syncItemMapping.update).toHaveBeenCalledWith({
      where: { id: "mapping-1" },
      data: {
        bridgemindVersion: "2025-01-15T14:00:00Z",
        lastSyncedAt: expect.any(Date),
      },
    });
  });

  it("should handle BridgeMind fetch errors", async () => {
    const clients = createMockClients({
      bridgemind: {
        listTasks: vi.fn().mockResolvedValue({
          data: null,
          error: "Connection refused",
        }),
      },
    });

    const result = await syncBridgeMindToGitHub(clients);

    expect(result.success).toBe(false);
    expect(result.errors).toContain("BridgeMind error: Connection refused");
  });

  it("should handle BridgeMind fetch throwing an exception", async () => {
    const clients = createMockClients({
      bridgemind: {
        listTasks: vi.fn().mockRejectedValue(new Error("Network timeout")),
      },
    });

    const result = await syncBridgeMindToGitHub(clients);

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("Network timeout");
  });

  it("should handle GitHub issue creation errors gracefully", async () => {
    vi.mocked(prisma.syncItemMapping.findUnique).mockResolvedValue(null);

    const clients = createMockClients({
      bridgemind: {
        listTasks: vi.fn().mockResolvedValue({
          data: [TASK_FIXTURE],
          error: null,
        }),
      },
      github: {
        createIssue: vi.fn().mockResolvedValue({
          data: null,
          error: "Rate limit exceeded",
        }),
        addItemToProject: vi.fn().mockResolvedValue({
          data: { itemId: "pi-1" },
          error: null,
        }),
      },
    });

    const result = await syncBridgeMindToGitHub(clients);

    expect(result.created).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("bm-task-1");
  });

  it("should handle sync state initialization failure", async () => {
    vi.mocked(prisma.syncState.findFirst).mockRejectedValue(
      new Error("DB connection lost"),
    );

    const clients = createMockClients();
    const result = await syncBridgeMindToGitHub(clients);

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("Failed to initialize sync state");
  });

  it("should handle sync state update to SYNCING failure", async () => {
    vi.mocked(prisma.syncState.update).mockRejectedValueOnce(
      new Error("DB write error"),
    );

    const clients = createMockClients();
    const result = await syncBridgeMindToGitHub(clients);

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("Failed to update sync state");
  });

  it("should handle mapping lookup errors", async () => {
    vi.mocked(prisma.syncItemMapping.findUnique).mockRejectedValue(
      new Error("Query timeout"),
    );

    const clients = createMockClients({
      bridgemind: {
        listTasks: vi.fn().mockResolvedValue({
          data: [TASK_FIXTURE],
          error: null,
        }),
      },
    });

    const result = await syncBridgeMindToGitHub(clients);

    expect(result.errors[0]).toContain("Failed to check mapping");
  });

  it("should log sync events for created items", async () => {
    vi.mocked(prisma.syncItemMapping.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.syncItemMapping.create).mockResolvedValue({
      id: "mapping-1",
      bridgemindId: "bm-task-1",
      githubIssueNumber: 1,
      githubIssueId: "issue-id-1",
      githubProjectItemId: "project-item-1",
      bridgemindVersion: "2025-01-15T14:00:00Z",
      lastSyncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const clients = createMockClients({
      bridgemind: {
        listTasks: vi.fn().mockResolvedValue({
          data: [TASK_FIXTURE],
          error: null,
        }),
      },
    });

    await syncBridgeMindToGitHub(clients);

    // Should log ITEM_CREATED and SYNC_COMPLETED events
    const createCalls = vi.mocked(prisma.syncEvent.create).mock.calls;
    const eventTypes = createCalls.map((call) => call[0].data.eventType);
    expect(eventTypes).toContain("ITEM_CREATED");
    expect(eventTypes).toContain("SYNC_COMPLETED");
  });

  it("should process multiple tasks correctly", async () => {
    const tasks = [
      { ...TASK_FIXTURE, id: "bm-1", title: "Task 1" },
      { ...TASK_FIXTURE, id: "bm-2", title: "Task 2" },
      { ...TASK_FIXTURE, id: "bm-3", title: "Task 3" },
    ];

    vi.mocked(prisma.syncItemMapping.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.syncItemMapping.create).mockResolvedValue({
      id: "mapping-1",
      bridgemindId: "bm-1",
      githubIssueNumber: 1,
      githubIssueId: "issue-id-1",
      githubProjectItemId: "project-item-1",
      bridgemindVersion: "2025-01-15T14:00:00Z",
      lastSyncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const clients = createMockClients({
      bridgemind: {
        listTasks: vi.fn().mockResolvedValue({
          data: tasks,
          error: null,
        }),
      },
    });

    const result = await syncBridgeMindToGitHub(clients);

    expect(result.success).toBe(true);
    expect(result.created).toBe(3);
    expect(clients.github.createIssue).toHaveBeenCalledTimes(3);
  });

  it("should mark sync state as complete on success", async () => {
    const clients = createMockClients();
    await syncBridgeMindToGitHub(clients);

    // The finalize call should set status to IDLE on success
    const updateCalls = vi.mocked(prisma.syncState.update).mock.calls;
    // Last update call is finalization
    const lastCall = updateCalls[updateCalls.length - 1]!;
    expect(lastCall[0].data.status).toBe("IDLE");
  });

  it("should handle update mapping failure gracefully", async () => {
    vi.mocked(prisma.syncItemMapping.findUnique).mockResolvedValue({
      id: "mapping-1",
      bridgemindId: "bm-task-1",
      githubIssueNumber: 1,
      githubIssueId: "issue-id-1",
      githubProjectItemId: "project-item-1",
      bridgemindVersion: "2025-01-10T10:00:00Z", // older than task.updatedAt
      lastSyncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(prisma.syncItemMapping.update).mockRejectedValue(
      new Error("DB write error"),
    );

    const clients = createMockClients({
      bridgemind: {
        listTasks: vi.fn().mockResolvedValue({
          data: [TASK_FIXTURE],
          error: null,
        }),
      },
    });

    const result = await syncBridgeMindToGitHub(clients);

    expect(result.updated).toBe(0);
    expect(result.errors[0]).toContain("Failed to update mapping for bm-task-1");
  });

  it("should handle finalizeSyncState failure gracefully", async () => {
    // First update call (SYNCING) succeeds, second (finalize) fails
    vi.mocked(prisma.syncState.update)
      .mockResolvedValueOnce(SYNC_STATE_FIXTURE) // SYNCING update
      .mockRejectedValueOnce(new Error("Finalize failed")); // finalize update

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const clients = createMockClients();
    const result = await syncBridgeMindToGitHub(clients);

    // Should still complete (just logs the finalize error)
    expect(result.success).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to finalize sync state:",
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it("should handle addItemToProject failure gracefully (still creates mapping)", async () => {
    vi.mocked(prisma.syncItemMapping.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.syncItemMapping.create).mockResolvedValue({
      id: "mapping-1",
      bridgemindId: "bm-task-1",
      githubIssueNumber: 1,
      githubIssueId: "issue-id-1",
      githubProjectItemId: null,
      bridgemindVersion: "2025-01-15T14:00:00Z",
      lastSyncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const clients = createMockClients({
      bridgemind: {
        listTasks: vi.fn().mockResolvedValue({
          data: [TASK_FIXTURE],
          error: null,
        }),
      },
      github: {
        createIssue: vi.fn().mockResolvedValue({
          data: { number: 1, id: "issue-id-1", url: "https://github.com/test/1" },
          error: null,
        }),
        addItemToProject: vi.fn().mockResolvedValue({
          data: null,
          error: "Project not found",
        }),
      },
    });

    const result = await syncBridgeMindToGitHub(clients);

    // Should still succeed since the issue was created
    expect(result.created).toBe(1);
    expect(prisma.syncItemMapping.create).toHaveBeenCalled();
  });
});
