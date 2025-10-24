import { describe, it, expect, vi } from 'vitest'

vi.mock('@/auth', () => ({
  handlers: {
    GET: vi.fn(),
    POST: vi.fn(),
  },
}))

describe('NextAuth API Route', () => {
  it('should export GET handler', async () => {
    const { GET } = await import('./route')
    expect(GET).toBeDefined()
    expect(typeof GET).toBe('function')
  })

  it('should export POST handler', async () => {
    const { POST } = await import('./route')
    expect(POST).toBeDefined()
    expect(typeof POST).toBe('function')
  })

  it('should export handlers from auth config', async () => {
    const { GET, POST } = await import('./route')
    const { handlers } = await import('@/auth')
    expect(GET).toBe(handlers.GET)
    expect(POST).toBe(handlers.POST)
  })
})
