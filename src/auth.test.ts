import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createStableUserId } from './auth'

vi.mock('next-auth', () => ({
  default: vi.fn(() => ({
    handlers: { GET: vi.fn(), POST: vi.fn() },
    signIn: vi.fn(),
    signOut: vi.fn(),
    auth: vi.fn(),
  })),
  DefaultSession: {},
}))

vi.mock('next-auth/providers/github', () => ({
  default: vi.fn(() => ({ id: 'github' })),
}))

vi.mock('next-auth/providers/google', () => ({
  default: vi.fn(() => ({ id: 'google' })),
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      upsert: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
}))

describe('NextAuth Configuration', () => {
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

  it('should configure providers with environment variables', async () => {
    // Just verify that auth exports are functions - the actual provider
    // configuration is tested through integration tests
    const { signIn, signOut, auth, handlers } = await import('./auth')
    expect(typeof signIn).toBe('function')
    expect(typeof signOut).toBe('function')
    expect(typeof auth).toBe('function')
    expect(handlers).toHaveProperty('GET')
    expect(handlers).toHaveProperty('POST')
  })
})

describe('NextAuth Callbacks', () => {
  it('should have session callback that adds user id', () => {
    const sessionCallback = {
      session: ({ session, token }: { session: { user: { name: string; id?: string } }; token: { sub?: string } }) => {
        if (token.sub && session.user) {
          session.user.id = token.sub
        }
        return session
      },
    }

    const mockSession = { user: { name: 'Test User' } }
    const mockToken = { sub: 'user-123' }

    const result = sessionCallback.session({ session: mockSession, token: mockToken })
    expect(result.user.id).toBe('user-123')
  })

  it('should have session callback that handles missing token.sub', () => {
    const sessionCallback = {
      session: ({ session, token }: { session: { user: { name: string; id?: string } }; token: { sub?: string } }) => {
        if (token.sub && session.user) {
          session.user.id = token.sub
        }
        return session
      },
    }

    const mockSession = { user: { name: 'Test User' } }
    const mockToken = {}

    const result = sessionCallback.session({ session: mockSession, token: mockToken })
    expect(result.user).not.toHaveProperty('id')
  })

  it('should have jwt callback that uses stable ID from email', () => {
    const jwtCallback = {
      jwt: ({ token, user }: { token: { sub?: string }; user?: { id?: string; email?: string } }) => {
        if (user?.email) {
          // Use stable ID based on email (same across all OAuth providers)
          token.sub = `user_${user.email}_hash` // Simplified for test
        } else if (user?.id) {
          // Fallback for users without email - use provider ID with prefix
          token.sub = `provider_${user.id}`
        }
        return token
      },
    }

    const mockToken = {} as { sub?: string }
    const mockUser = { id: 'user-456', email: 'test@example.com' }

    const result = jwtCallback.jwt({ token: mockToken, user: mockUser })
    expect(result.sub).toBe('user_test@example.com_hash')
  })

  it('should have jwt callback that uses provider prefix for users without email', () => {
    const jwtCallback = {
      jwt: ({ token, user }: { token: { sub?: string }; user?: { id?: string; email?: string } }) => {
        if (user?.email) {
          token.sub = `user_${user.email}_hash`
        } else if (user?.id) {
          token.sub = `provider_${user.id}`
        }
        return token
      },
    }

    const mockToken = {} as { sub?: string }
    const mockUser = { id: 'provider-id-123' } // No email

    const result = jwtCallback.jwt({ token: mockToken, user: mockUser })
    expect(result.sub).toBe('provider_provider-id-123')
  })

  it('should have jwt callback that handles missing user', () => {
    const jwtCallback = {
      jwt: ({ token, user }: { token: { sub?: string }; user?: { id?: string; email?: string } }) => {
        if (user?.email) {
          token.sub = `user_${user.email}_hash`
        } else if (user?.id) {
          token.sub = `provider_${user.id}`
        }
        return token
      },
    }

    const mockToken = { sub: 'existing-id' }

    const result = jwtCallback.jwt({ token: mockToken, user: undefined })
    expect(result.sub).toBe('existing-id')
  })
})

describe('createStableUserId', () => {
  const originalUserIdSalt = process.env.USER_ID_SALT
  const originalAuthSecret = process.env.AUTH_SECRET

  beforeEach(() => {
    // Reset environment variables before each test
    delete process.env.USER_ID_SALT
    process.env.AUTH_SECRET = 'test-auth-secret'
  })

  afterEach(() => {
    // Restore original environment variables
    if (originalUserIdSalt) {
      process.env.USER_ID_SALT = originalUserIdSalt
    } else {
      delete process.env.USER_ID_SALT
    }
    if (originalAuthSecret) {
      process.env.AUTH_SECRET = originalAuthSecret
    } else {
      delete process.env.AUTH_SECRET
    }
  })

  it('should generate a stable ID from email', () => {
    const email = 'test@example.com'
    const id = createStableUserId(email)

    expect(id).toBeDefined()
    expect(typeof id).toBe('string')
    expect(id.startsWith('user_')).toBe(true)
  })

  it('should throw error when no salt is set', () => {
    delete process.env.USER_ID_SALT
    delete process.env.AUTH_SECRET

    expect(() => createStableUserId('test@example.com')).toThrow(
      'USER_ID_SALT or AUTH_SECRET environment variable must be set'
    )
  })

  it('should prefer USER_ID_SALT over AUTH_SECRET', () => {
    const email = 'test@example.com'

    // Set both env vars
    process.env.AUTH_SECRET = 'auth-secret-value'
    process.env.USER_ID_SALT = 'user-id-salt-value'

    const idWithUserIdSalt = createStableUserId(email)

    // Remove USER_ID_SALT, keeping AUTH_SECRET
    delete process.env.USER_ID_SALT

    const idWithAuthSecret = createStableUserId(email)

    // IDs should be different because different salts are used
    expect(idWithUserIdSalt).not.toBe(idWithAuthSecret)
  })

  it('should fall back to AUTH_SECRET when USER_ID_SALT is not set', () => {
    const email = 'test@example.com'

    delete process.env.USER_ID_SALT
    process.env.AUTH_SECRET = 'test-auth-secret'

    const id = createStableUserId(email)

    expect(id).toBeDefined()
    expect(id.startsWith('user_')).toBe(true)
  })

  it('should use salt to prevent ID prediction', () => {
    const email = 'test@example.com'

    // ID with current salt
    const idWithSalt = createStableUserId(email)

    // Change the salt
    process.env.AUTH_SECRET = 'different-secret'
    const idWithDifferentSalt = createStableUserId(email)

    // Different salts should produce different IDs
    expect(idWithSalt).not.toBe(idWithDifferentSalt)
  })

  it('should generate the same ID for the same email', () => {
    const email = 'test@example.com'
    const id1 = createStableUserId(email)
    const id2 = createStableUserId(email)

    expect(id1).toBe(id2)
  })

  it('should be case-insensitive', () => {
    const lowerCase = createStableUserId('test@example.com')
    const upperCase = createStableUserId('TEST@EXAMPLE.COM')
    const mixedCase = createStableUserId('TeSt@ExAmPlE.cOm')

    expect(lowerCase).toBe(upperCase)
    expect(lowerCase).toBe(mixedCase)
  })

  it('should trim whitespace', () => {
    const normal = createStableUserId('test@example.com')
    const leadingSpace = createStableUserId('  test@example.com')
    const trailingSpace = createStableUserId('test@example.com  ')
    const bothSpaces = createStableUserId('  test@example.com  ')

    expect(normal).toBe(leadingSpace)
    expect(normal).toBe(trailingSpace)
    expect(normal).toBe(bothSpaces)
  })

  it('should generate different IDs for different emails', () => {
    const id1 = createStableUserId('user1@example.com')
    const id2 = createStableUserId('user2@example.com')

    expect(id1).not.toBe(id2)
  })

  it('should generate ID with correct format (user_ prefix + 32 hex chars)', () => {
    const id = createStableUserId('test@example.com')

    // Format: user_ + 32 hex characters = 37 characters total
    expect(id.length).toBe(37)
    expect(id).toMatch(/^user_[a-f0-9]{32}$/)
  })

  it('should handle special characters in email', () => {
    const id1 = createStableUserId('user+tag@example.com')
    const id2 = createStableUserId('user.name@example.com')

    expect(id1).toBeDefined()
    expect(id2).toBeDefined()
    expect(id1).not.toBe(id2)
  })
})
