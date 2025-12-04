/**
 * Tests for Token Economics API Route
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET } from "./route"

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}))
vi.mock("@/lib/prisma", () => ({
  default: {
    tokenTransaction: {
      groupBy: vi.fn(),
      count: vi.fn(),
    },
    stripePayment: {
      aggregate: vi.fn(),
    },
    userTokenBalance: {
      aggregate: vi.fn(),
    },
    tokensPackage: {
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}))
vi.mock("@/lib/auth/admin-middleware", () => ({
  requireAdminByUserId: vi.fn(),
}))

const { auth } = await import("@/auth")
const prisma = (await import("@/lib/prisma")).default

describe("Token Economics API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
  })

  it("should return token analytics data for admin users", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin_123" },
    } as any)

    vi.mocked(prisma.tokenTransaction.groupBy).mockResolvedValue([
      { type: "EARN_PURCHASE", _sum: { amount: 1000 } },
      { type: "SPEND_ENHANCEMENT", _sum: { amount: -500 } },
    ] as any)

    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      { date: new Date("2025-01-01"), purchased: BigInt(100), spent: BigInt(50) },
    ])

    vi.mocked(prisma.stripePayment.aggregate).mockResolvedValue({
      _sum: { amountUSD: 500 },
    } as any)

    vi.mocked(prisma.userTokenBalance.aggregate).mockResolvedValue({
      _avg: { balance: 50 },
      _sum: { balance: 5000 },
    } as any)

    vi.mocked(prisma.tokenTransaction.count).mockResolvedValue(100)

    vi.mocked(prisma.tokensPackage.findMany).mockResolvedValue([
      { name: "Basic", tokens: 100, stripePayments: [{ id: "1" }, { id: "2" }] },
    ] as any)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty("tokensByType")
    expect(data).toHaveProperty("dailyTokens")
    expect(data).toHaveProperty("revenue")
    expect(data).toHaveProperty("circulation")
    expect(data).toHaveProperty("regenerationCount")
    expect(data).toHaveProperty("packageSales")
  })

  it("should handle errors gracefully", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin_123" },
    } as any)

    vi.mocked(prisma.tokenTransaction.groupBy).mockRejectedValue(new Error("DB error"))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Internal server error")
  })
})
