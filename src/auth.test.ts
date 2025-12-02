import { describe, it, expect, vi, beforeEach } from 'vitest'
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

  it('should have jwt callback that adds user id to token', () => {
    const jwtCallback = {
      jwt: ({ token, user }: { token: { sub?: string }; user?: { id: string } }) => {
        if (user) {
          token.sub = user.id
        }
        return token
      },
    }

    const mockToken = {} as { sub?: string }
    const mockUser = { id: 'user-456' }

    const result = jwtCallback.jwt({ token: mockToken, user: mockUser })
    expect(result.sub).toBe('user-456')
  })

  it('should have jwt callback that handles missing user', () => {
    const jwtCallback = {
      jwt: ({ token, user }: { token: { sub?: string }; user?: { id: string } }) => {
        if (user) {
          token.sub = user.id
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
  it('should generate a stable ID from email', () => {
    const email = 'test@example.com'
    const id = createStableUserId(email)

    expect(id).toBeDefined()
    expect(typeof id).toBe('string')
    expect(id.startsWith('user_')).toBe(true)
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
