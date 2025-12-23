import { beforeEach, describe, expect, it, vi } from "vitest";

// Vitest 4: Use class constructor for PrismaClient mock
vi.mock("@prisma/client", () => ({
  PrismaClient: class MockPrismaClient {
    $connect = vi.fn();
    $disconnect = vi.fn();
  },
}));

// Mock PrismaPg adapter
vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: class MockPrismaPg {
    constructor() {}
  },
}));

describe("Prisma Client Singleton", () => {
  beforeEach(() => {
    vi.resetModules();
    delete (globalThis as { prismaGlobal?: unknown; }).prismaGlobal;
  });

  it("should create a Prisma client instance", async () => {
    const prisma = await import("./prisma");
    expect(prisma.default).toBeDefined();
  });

  it("should use singleton pattern in development", async () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as { NODE_ENV?: string; }).NODE_ENV = "development";

    const prisma1 = await import("./prisma");
    const instance1 = prisma1.default;

    vi.resetModules();

    const prisma2 = await import("./prisma");
    const instance2 = prisma2.default;

    expect(instance1).toBe(instance2);

    (process.env as { NODE_ENV?: string; }).NODE_ENV = originalEnv;
  });

  it("should attach to globalThis in non-production", async () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as { NODE_ENV?: string; }).NODE_ENV = "development";

    await import("./prisma");

    expect((globalThis as { prismaGlobal?: unknown; }).prismaGlobal)
      .toBeDefined();

    (process.env as { NODE_ENV?: string; }).NODE_ENV = originalEnv;
  });

  it("should not attach to globalThis in production", async () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as { NODE_ENV?: string; }).NODE_ENV = "production";

    delete (globalThis as { prismaGlobal?: unknown; }).prismaGlobal;

    await import("./prisma");

    expect((globalThis as { prismaGlobal?: unknown; }).prismaGlobal)
      .toBeUndefined();

    (process.env as { NODE_ENV?: string; }).NODE_ENV = originalEnv;
  });

  it("should use PrismaPg adapter when DATABASE_URL is set", async () => {
    const originalDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/testdb";

    vi.resetModules();
    delete (globalThis as { prismaGlobal?: unknown; }).prismaGlobal;

    const prisma = await import("./prisma");
    expect(prisma.default).toBeDefined();

    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it("should use development logging with DATABASE_URL in development mode", async () => {
    const originalDatabaseUrl = process.env.DATABASE_URL;
    const originalEnv = process.env.NODE_ENV;
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/testdb";
    (process.env as { NODE_ENV?: string; }).NODE_ENV = "development";

    vi.resetModules();
    delete (globalThis as { prismaGlobal?: unknown; }).prismaGlobal;

    const prisma = await import("./prisma");
    expect(prisma.default).toBeDefined();

    process.env.DATABASE_URL = originalDatabaseUrl;
    (process.env as { NODE_ENV?: string; }).NODE_ENV = originalEnv;
  });
});
