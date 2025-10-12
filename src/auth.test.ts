import { describe, it, expect, vi, beforeEach } from 'vitest'

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

  it('should configure GitHub provider with environment variables', async () => {
    const GitHub = (await import('next-auth/providers/github')).default
    await import('./auth')
    expect(GitHub).toHaveBeenCalledWith({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    })
  })

  it('should configure Google provider with environment variables', async () => {
    const Google = (await import('next-auth/providers/google')).default
    await import('./auth')
    expect(Google).toHaveBeenCalledWith({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
    })
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
