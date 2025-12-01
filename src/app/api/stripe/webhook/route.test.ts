import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Create mock functions using vi.hoisted to ensure they're available in vi.mock
const { mockConstructEvent, mockSubscriptionsRetrieve } = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
  mockSubscriptionsRetrieve: vi.fn(),
}))

// Mock Stripe
vi.mock('@/lib/stripe/client', () => ({
  getStripe: () => ({
    webhooks: {
      constructEvent: mockConstructEvent,
    },
    subscriptions: {
      retrieve: mockSubscriptionsRetrieve,
    },
  }),
}))

// Mock Prisma with static mock implementation
vi.mock('@/lib/prisma', () => ({
  default: {
    $transaction: vi.fn((fn) => fn({
      userTokenBalance: {
        findUnique: vi.fn().mockResolvedValue({ balance: 10 }),
        create: vi.fn().mockResolvedValue({ balance: 0 }),
        update: vi.fn().mockResolvedValue({}),
      },
      tokenTransaction: {
        create: vi.fn().mockResolvedValue({}),
      },
      tokensPackage: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      stripePayment: {
        create: vi.fn().mockResolvedValue({}),
      },
      subscription: {
        upsert: vi.fn().mockResolvedValue({}),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({}),
        updateMany: vi.fn().mockResolvedValue({}),
      },
    })),
    subscription: {
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({}),
    },
    user: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
}))

import { POST } from './route'

describe('POST /api/stripe/webhook', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123'
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns 400 when stripe-signature header is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing stripe-signature header')
  })

  it('returns 500 when webhook secret is not configured', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET

    const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'stripe-signature': 'sig_test' },
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Webhook secret not configured')
    consoleSpy.mockRestore()
  })

  it('returns 400 when signature verification fails', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature')
    })

    const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'stripe-signature': 'sig_invalid' },
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Webhook signature verification failed')
    consoleSpy.mockRestore()
  })

  it('handles checkout.session.completed for token purchase', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_123',
          metadata: {
            userId: 'user_123',
            type: 'token_purchase',
            tokens: '50',
            packageId: 'basic',
          },
          amount_total: 999,
          payment_intent: 'pi_123',
        },
      },
    })

    const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      body: 'test_body',
      headers: { 'stripe-signature': 'sig_valid' },
    })

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.received).toBe(true)
    consoleSpy.mockRestore()
  })

  it('handles checkout.session.completed for subscription', async () => {
    const subscriptionStart = Math.floor(Date.now() / 1000)
    const subscriptionEnd = subscriptionStart + 30 * 24 * 60 * 60

    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_123',
          subscription: 'sub_123',
          metadata: {
            userId: 'user_123',
            type: 'subscription',
            planId: 'hobby',
            tokensPerMonth: '30',
            maxRollover: '30',
          },
        },
      },
    })
    mockSubscriptionsRetrieve.mockResolvedValue({
      current_period_start: subscriptionStart,
      current_period_end: subscriptionEnd,
      items: {
        data: [{ price: { id: 'price_123' } }],
      },
    })

    const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      body: 'test_body',
      headers: { 'stripe-signature': 'sig_valid' },
    })

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.received).toBe(true)
    consoleSpy.mockRestore()
  })

  it('ignores event when userId is missing from metadata', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_123',
          metadata: {},
        },
      },
    })

    const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      body: 'test_body',
      headers: { 'stripe-signature': 'sig_valid' },
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.received).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith('No userId in checkout session metadata')
    consoleSpy.mockRestore()
  })

  it('handles customer.subscription.updated event', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_123',
          status: 'active',
          cancel_at_period_end: false,
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        },
      },
    })

    const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      body: 'test_body',
      headers: { 'stripe-signature': 'sig_valid' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.received).toBe(true)
  })

  it('handles customer.subscription.deleted event', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_123',
        },
      },
    })

    const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      body: 'test_body',
      headers: { 'stripe-signature': 'sig_valid' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.received).toBe(true)
  })

  it('logs unhandled event types', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'some.other.event',
      data: { object: {} },
    })

    const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      body: 'test_body',
      headers: { 'stripe-signature': 'sig_valid' },
    })

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.received).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith('Unhandled event type: some.other.event')
    consoleSpy.mockRestore()
  })
})
