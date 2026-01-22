import { syncInboxConnections } from "./inbox-sync";
// Mock prisma
import prisma from "@/lib/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    inboxItem: {
      groupBy: vi.fn(),
    },
    connectionPlatformPresence: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    connection: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

describe("syncInboxConnections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates new connections for unique senders", async () => {
    (prisma.inboxItem.groupBy as any).mockResolvedValue([
      { senderHandle: "@newuser", platform: "TWITTER", senderName: "New User" },
    ]);

    (prisma.connectionPlatformPresence.findFirst as any).mockResolvedValue(null);

    // Mock txn results
    (prisma.connection.create as any).mockResolvedValue({ id: "conn1" });

    const result = await syncInboxConnections("ws1");

    expect(prisma.connection.create).toHaveBeenCalled();
    expect(prisma.connectionPlatformPresence.create).toHaveBeenCalled();
    expect(result.created).toBe(1);
  });

  it("skips existing connections", async () => {
    (prisma.inboxItem.groupBy as any).mockResolvedValue([
      { senderHandle: "@existing", platform: "TWITTER" },
    ]);

    (prisma.connectionPlatformPresence.findFirst as any).mockResolvedValue({ id: "presence1" });

    const result = await syncInboxConnections("ws1");

    expect(prisma.connection.create).not.toHaveBeenCalled();
    expect(result.created).toBe(0);
  });
});
