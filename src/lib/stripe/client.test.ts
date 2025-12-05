import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Stripe before importing the module - Vitest 4: Use class constructor
vi.mock('stripe', () => ({
  default: class MockStripe {
    customers = {}
    checkout = {}
    subscriptions = {}
    webhooks = {
      constructEvent: vi.fn()
    }
  }
}))

describe('Stripe Client', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('getStripe', () => {
    it('throws error when STRIPE_SECRET_KEY is not configured', async () => {
      delete process.env.STRIPE_SECRET_KEY
      const { getStripe } = await import('./client')
      expect(() => getStripe()).toThrow('STRIPE_SECRET_KEY is not configured')
    })

    it('returns a Stripe client when STRIPE_SECRET_KEY is configured', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      const { getStripe } = await import('./client')
      const client = getStripe()
      expect(client).toBeDefined()
    })

    it('returns the same instance on subsequent calls', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      const { getStripe } = await import('./client')
      const client1 = getStripe()
      const client2 = getStripe()
      expect(client1).toBe(client2)
    })
  })

  describe('stripe proxy object', () => {
    it('provides access to Stripe resources', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      const { stripe } = await import('./client')
      expect(stripe.customers).toBeDefined()
      expect(stripe.checkout).toBeDefined()
      expect(stripe.subscriptions).toBeDefined()
      expect(stripe.webhooks).toBeDefined()
    })
  })

  describe('CURRENCY', () => {
    it('has correct currency configuration', async () => {
      const { CURRENCY } = await import('./client')

      expect(CURRENCY).toEqual({
        code: 'GBP',
        symbol: '£',
      })
    })
  })

  describe('TOKEN_PACKAGES', () => {
    it('has all required packages with correct structure', async () => {
      const { TOKEN_PACKAGES } = await import('./client')

      expect(TOKEN_PACKAGES.starter).toEqual({
        tokens: 10,
        price: 2.99,
        name: 'Starter Pack',
      })

      expect(TOKEN_PACKAGES.basic).toEqual({
        tokens: 50,
        price: 9.99,
        name: 'Basic Pack',
      })

      expect(TOKEN_PACKAGES.pro).toEqual({
        tokens: 150,
        price: 24.99,
        name: 'Pro Pack',
      })

      expect(TOKEN_PACKAGES.power).toEqual({
        tokens: 500,
        price: 69.99,
        name: 'Power Pack',
      })
    })
  })

  describe('SUBSCRIPTION_PLANS', () => {
    it('has all required plans with correct structure', async () => {
      const { SUBSCRIPTION_PLANS } = await import('./client')

      expect(SUBSCRIPTION_PLANS.hobby).toEqual({
        tokensPerMonth: 30,
        priceGBP: 4.99,
        maxRollover: 30,
        name: 'Hobby',
      })

      expect(SUBSCRIPTION_PLANS.creator).toEqual({
        tokensPerMonth: 100,
        priceGBP: 12.99,
        maxRollover: 100,
        name: 'Creator',
      })

      expect(SUBSCRIPTION_PLANS.studio).toEqual({
        tokensPerMonth: 300,
        priceGBP: 29.99,
        maxRollover: 0,
        name: 'Studio',
      })
    })
  })

  describe('ENHANCEMENT_COSTS', () => {
    it('has correct tier costs', async () => {
      const { ENHANCEMENT_COSTS } = await import('./client')

      expect(ENHANCEMENT_COSTS.TIER_1K).toBe(1)
      expect(ENHANCEMENT_COSTS.TIER_2K).toBe(2)
      expect(ENHANCEMENT_COSTS.TIER_4K).toBe(5)
    })
  })
})
