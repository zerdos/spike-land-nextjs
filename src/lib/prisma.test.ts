import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/generated/prisma', () => {
  const mockPrismaClient = vi.fn().mockImplementation(() => ({
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  }))

  return {
    PrismaClient: mockPrismaClient,
  }
})

describe('Prisma Client Singleton', () => {
  beforeEach(() => {
    vi.resetModules()
    delete (globalThis as { prismaGlobal?: unknown }).prismaGlobal
  })

  it('should create a Prisma client instance', async () => {
    const prisma = await import('./prisma')
    expect(prisma.default).toBeDefined()
  })

  it('should use singleton pattern in development', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    const prisma1 = await import('./prisma')
    const instance1 = prisma1.default

    vi.resetModules()

    const prisma2 = await import('./prisma')
    const instance2 = prisma2.default

    expect(instance1).toBe(instance2)

    process.env.NODE_ENV = originalEnv
  })

  it('should attach to globalThis in non-production', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    await import('./prisma')

    expect((globalThis as { prismaGlobal?: unknown }).prismaGlobal).toBeDefined()

    process.env.NODE_ENV = originalEnv
  })

  it('should not attach to globalThis in production', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    delete (globalThis as { prismaGlobal?: unknown }).prismaGlobal

    await import('./prisma')

    expect((globalThis as { prismaGlobal?: unknown }).prismaGlobal).toBeUndefined()

    process.env.NODE_ENV = originalEnv
  })
})
