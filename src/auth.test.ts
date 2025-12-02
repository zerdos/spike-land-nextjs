import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma before importing auth
const mockUpsert = vi.fn().mockResolvedValue({})
vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      upsert: mockUpsert,
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
}))

vi.mock('next-auth', () => ({
  default: vi.fn((config) => ({
    handlers: { GET: vi.fn(), POST: vi.fn() },
    signIn: vi.fn(),
    signOut: vi.fn(),
    auth: vi.fn(),
    _config: config, // Expose config for testing
  })),
  DefaultSession: {},
}))

vi.mock('next-auth/providers/github', () => ({
  default: vi.fn(() => ({ id: 'github' })),
}))

vi.mock('next-auth/providers/google', () => ({
  default: vi.fn(() => ({ id: 'google' })),
}))

describe('NextAuth Full Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GITHUB_ID = 'test-github-id'
    process.env.GITHUB_SECRET = 'test-github-secret'
    process.env.GOOGLE_ID = 'test-google-id'
    process.env.GOOGLE_SECRET = 'test-google-secret'
    process.env.AUTH_SECRET = 'test-auth-secret'
  })

  it('should export handlers object', async () => {
    const { handlers } = await import('./auth')
    expect(handlers).toBeDefined()
    expect(handlers).toHaveProperty('GET')
    expect(handlers).toHaveProperty('POST')
  })

  it('should export signIn function', async () => {
    const { signIn } = await import('./auth')
    expect(signIn).toBeDefined()
    expect(typeof signIn).toBe('function')
  })

  it('should export signOut function', async () => {
    const { signOut } = await import('./auth')
    expect(signOut).toBeDefined()
    expect(typeof signOut).toBe('function')
  })

  it('should export auth function', async () => {
    const { auth } = await import('./auth')
    expect(auth).toBeDefined()
    expect(typeof auth).toBe('function')
  })

  it('should re-export createStableUserId', async () => {
    const { createStableUserId } = await import('./auth')
    expect(createStableUserId).toBeDefined()
    expect(typeof createStableUserId).toBe('function')
  })

  it('should export handleSignIn function', async () => {
    const { handleSignIn } = await import('./auth')
    expect(handleSignIn).toBeDefined()
    expect(typeof handleSignIn).toBe('function')
  })
})

describe('handleSignIn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpsert.mockResolvedValue({})
    process.env.AUTH_SECRET = 'test-auth-secret'
  })

  it('should upsert user with stable ID when email is provided', async () => {
    const { handleSignIn, createStableUserId } = await import('./auth')
    const user = { email: 'test@example.com', name: 'Test User', image: 'https://example.com/avatar.jpg' }

    const result = await handleSignIn(user)

    expect(result).toBe(true)
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
      update: {
        name: 'Test User',
        image: 'https://example.com/avatar.jpg',
      },
      create: {
        id: createStableUserId('test@example.com'),
        email: 'test@example.com',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg',
      },
    })
  })

  it('should return true when user has no email', async () => {
    const { handleSignIn } = await import('./auth')
    const user = { name: 'Test User', image: 'https://example.com/avatar.jpg' }

    const result = await handleSignIn(user)

    expect(result).toBe(true)
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('should return true when email is null', async () => {
    const { handleSignIn } = await import('./auth')
    const user = { email: null, name: 'Test User' }

    const result = await handleSignIn(user)

    expect(result).toBe(true)
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('should handle undefined name and image', async () => {
    const { handleSignIn, createStableUserId } = await import('./auth')
    const user = { email: 'test@example.com' }

    const result = await handleSignIn(user)

    expect(result).toBe(true)
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
      update: {
        name: undefined,
        image: undefined,
      },
      create: {
        id: createStableUserId('test@example.com'),
        email: 'test@example.com',
        name: undefined,
        image: undefined,
      },
    })
  })

  it('should handle null name and image', async () => {
    const { handleSignIn, createStableUserId } = await import('./auth')
    const user = { email: 'test@example.com', name: null, image: null }

    const result = await handleSignIn(user)

    expect(result).toBe(true)
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
      update: {
        name: undefined,
        image: undefined,
      },
      create: {
        id: createStableUserId('test@example.com'),
        email: 'test@example.com',
        name: null,
        image: null,
      },
    })
  })

  it('should return true and log error on database failure', async () => {
    const { handleSignIn } = await import('./auth')
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const dbError = new Error('Database connection failed')
    mockUpsert.mockRejectedValueOnce(dbError)

    const user = { email: 'test@example.com', name: 'Test User' }
    const result = await handleSignIn(user)

    // Should still return true to allow sign-in
    expect(result).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith('Failed to upsert user with stable ID:', dbError)

    consoleSpy.mockRestore()
  })

  it('should not block sign-in on any database error type', async () => {
    const { handleSignIn } = await import('./auth')
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Test various error types
    const errorTypes = [
      new Error('Connection timeout'),
      new Error('Unique constraint violation'),
      new Error('Database unavailable'),
    ]

    for (const error of errorTypes) {
      mockUpsert.mockRejectedValueOnce(error)
      const result = await handleSignIn({ email: 'test@example.com' })
      expect(result).toBe(true)
    }

    consoleSpy.mockRestore()
  })
})
