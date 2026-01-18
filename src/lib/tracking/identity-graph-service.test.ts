import prisma from "@/lib/prisma";
import type { IdentifierType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addIdentifier,
  createIdentity,
  findIdentityByIdentifier,
  mergeIdentities,
} from "./identity-graph-service";

vi.mock("@/lib/prisma", () => ({
  default: {
    identity: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    identifier: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("Identity Graph Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a new identity with an initial identifier", async () => {
    const mockIdentity = {
      id: "identity-1",
      userId: null,
      identifiers: [{ id: "identifier-1", type: "VISITOR_ID", value: "visitor-123" }],
    };
    vi.mocked(prisma.identity.create).mockResolvedValue(mockIdentity as any);

    const identity = await createIdentity("VISITOR_ID" as IdentifierType, "visitor-123");

    expect(prisma.identity.create).toHaveBeenCalledWith({
      data: {
        identifiers: {
          create: {
            type: "VISITOR_ID",
            value: "visitor-123",
          },
        },
      },
      include: {
        identifiers: true,
      },
    });
    expect(identity).toEqual(mockIdentity);
  });

  it("should add a new identifier to an existing identity", async () => {
    const mockIdentity = {
      id: "identity-1",
      userId: null,
      identifiers: [
        { id: "identifier-1", type: "VISITOR_ID", value: "visitor-123" },
        { id: "identifier-2", type: "USER_ID", value: "user-456" },
      ],
    };
    vi.mocked(prisma.identity.update).mockResolvedValue(mockIdentity as any);

    const identity = await addIdentifier("identity-1", "USER_ID" as IdentifierType, "user-456");

    expect(prisma.identity.update).toHaveBeenCalledWith({
      where: { id: "identity-1" },
      data: {
        identifiers: {
          create: {
            type: "USER_ID",
            value: "user-456",
          },
        },
      },
      include: {
        identifiers: true,
      },
    });
    expect(identity).toEqual(mockIdentity);
  });

  it("should find an identity by one of its identifiers", async () => {
    const mockIdentifier = {
      id: "identifier-1",
      identityId: "identity-1",
      type: "VISITOR_ID",
      value: "visitor-123",
      identity: {
        id: "identity-1",
        userId: null,
        identifiers: [{ id: "identifier-1", type: "VISITOR_ID", value: "visitor-123" }],
      },
    };
    vi.mocked(prisma.identifier.findUnique).mockResolvedValue(mockIdentifier as any);

    const identity = await findIdentityByIdentifier("VISITOR_ID" as IdentifierType, "visitor-123");

    expect(prisma.identifier.findUnique).toHaveBeenCalledWith({
      where: {
        type_value: {
          type: "VISITOR_ID",
          value: "visitor-123",
        },
      },
      include: {
        identity: {
          include: {
            identifiers: true,
          },
        },
      },
    });
    expect(identity).toEqual(mockIdentifier.identity);
  });

  it("should merge two identities into one", async () => {
    const fromIdentityId = "identity-1";
    const toIdentityId = "identity-2";
    const finalIdentity = {
      id: toIdentityId,
      userId: "user-456",
      identifiers: [
        { id: "identifier-1", type: "VISITOR_ID", value: "visitor-123" },
        { id: "identifier-2", type: "USER_ID", value: "user-456" },
      ],
    };

    // Mock the transaction
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const tx = {
        identifier: {
          updateMany: vi.fn(),
        },
        identity: {
          delete: vi.fn(),
          findUnique: vi.fn().mockResolvedValue(finalIdentity),
        },
      };
      await callback(tx as any);
      return tx.identity.findUnique.mock.results[0]!.value;
    });

    const result = await mergeIdentities(fromIdentityId, toIdentityId);

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result).toEqual(finalIdentity);
  });
});
